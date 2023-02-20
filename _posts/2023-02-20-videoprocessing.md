---
layout: post
title:  "Video Processing"
description: Real time video processing
date:   2023-02-20 21:03:36 +0530
categories: Hardware VHDL Video_Processing
navig: 
  - title: Github Repo
    url: https://github.com/suguuss/video_processing
---


# Introduction

In this post I'm going to talk about real time video processing using the MAX10 Arrow Deca development board. I will talk about the different parts of the project such as the HDMI Driver, the convolution engine and the RGB to Gray converter.

Field-programmable gate arrays (FPGAs) are an excellent choice for video processing due to their high performance, low latency, flexibility, and the ability to perform multiple tasks in parallel. The FPGA I have on my development board is the MAX10 FPGA from Intel.

One of the key algorithms I wanted to implement is the convolution, which is a fundamental operation in image and video processing. Convolution involves taking a small matrix called a kernel and applying it to an image or video frame. This operation is used for a wide range of applications, including edge detection, blurring, and noise reduction. At the time of writing, I have only tested the edge detection, but I think it can do most of the effects.

When thinking about the project, I wanted the dataflow to look something like the following figure. Unfortunately I was not able to make the camera module work, so the project does not have a camera. Insted there is a generated pattern, and the convolution is applied to this pattern.

![supposed_block](/assets/convolution/supposed_block.png)

The block diagram of the current project is the following :

![real_block](/assets/convolution/real_block.png)

# HDMI Driver

The very first thing I wrote was the HDMI Driver. I need to be certain that the display works before I even try to display a processed output.

To send data to the screen, I'm going to use the HDMI TX connector present on the development board. The HDMI is controlled by a transmitter chip that translates VGA style data to HDMI data. The chip is the **ADV7513** ([datasheet](https://www.analog.com/media/en/technical-documentation/data-sheets/adv7513.pdf) and [User Manual](https://www.analog.com/media/en/technical-documentation/user-guides/adv7513_hardware_user_guide.pdf)). Because vga is pretty basic, this chip will simplify the driver by a lot.


## Getting the informations

Controlling a display using VGA data is not that hard. There are only 3 control signals (Data Enable, Horizontal Sync, Vertical Sync) and the RGB data. The figure below shows how the vertical and horizontal sync signals are used. In this figure, the polarity of the signals (vsync and hsync) is active low. It means the signal is low during the sync pulse. For some standard, the signals can be active high. The polarity is specified in the calculator listed below.

![vga_timings](/assets/convolution/vga_timings.jpg)


To get the correct timings, I used this [Video Timings Calculator](https://tomverbeure.github.io/video_timings_calculator). You can select any resolution and refresh rate, and it will give you all the informations needed. In the example below, I choose a 1080p resolution with a 60Hz refresh rate. The information that we need are in the column **CEA-861**. 

![calculator](/assets/convolution/calculator.jpg)

## VHDL implementation

The HDMI transmitter has to be configured using I2C. The code is not covered here, because I did not write it. It came with some example projets with the dev board. However, you can find the code in the `src/HDMI` folder in the github repository.

The entity of the HDMI driver is represented by the following VHDL code. The default values in the generic are for a resolution of 1080p @ 60Hz. 

```vhdl
entity HDMI_TX is
	generic (
		h_total: 	integer := 2200;
		h_front: 	integer :=   88;
		h_sync: 	integer :=   44;
		h_back: 	integer :=  148;
		h_active: 	integer := 1920;

		v_total: 	integer := 1125;
		v_front: 	integer :=    4;
		v_sync: 	integer :=    5;
		v_back: 	integer :=   36;
		v_active: 	integer := 1080
	);

	port (
		clk:		in		std_logic;
		rst_n:		in		std_logic;
		de:			out		std_logic;
		vs:			out		std_logic;
		hs:			out		std_logic;
		r:			out		std_logic_vector(7 downto 0);
		g:			out		std_logic_vector(7 downto 0);
		b:			out		std_logic_vector(7 downto 0)
	);
end HDMI_TX;
```

The architecture of the controller is made of 3 processes. One for the vertical sync, one for the horizontal sync and one for the data. When testing the driver, the data was either a full color or some random patterns.

```vhdl
architecture behavioral of HDMI_TX is

	signal h_count: integer 	:= 0;
	signal v_count: integer 	:= 0;
	
	signal h_act:	std_logic 	:= '0';
	signal v_act:	std_logic 	:= '0';

begin

	-- VGA controls

	h_ctrl: process(clk)
	begin
		if rising_edge(clk) then
			if rst_n = '0' then
				h_count <= 0;
				hs <= '0';
				h_act <= '0';
			else
				
				-- Counter
				if h_count = (h_total - 1) then
					h_count <= 0;
				else
					h_count <= h_count + 1;
				end if;
				
				-- sync and active signals handler
				if h_count < h_active then
					h_act <= '1';
					hs <= '0';
				elsif h_count < (h_active + h_front) then
					h_act <= '0';
					hs <= '0';
				elsif h_count < (h_active + h_front + h_sync) then
					h_act <= '0';
					hs <= '1';
				else
					h_act <= '0';
					hs <= '0';
				end if;
					
			end if;
		end if;
	end process; -- end h_ctrl
	
	
	v_ctrl: process(clk)
	begin
		if rising_edge(clk) then
			if rst_n = '0' then
				v_count <= 0;
				vs <= '0';
				v_act <= '0';
			else
				
				-- Counter
				if h_count = (h_total - 1) then
					if v_count = (v_total - 1) then
						v_count <= 0;
					else
						v_count <= v_count + 1;
					end if;
				end if;
				
				-- sync and active signals handler
				if v_count < v_active then
					v_act <= '1';
					vs <= '0';
				elsif v_count < (v_active + v_front) then
					v_act <= '0';
					vs <= '0';
				elsif v_count < (v_active + v_front + v_sync) then
					v_act <= '0';
					vs <= '1';
				else
					v_act <= '0';
					vs <= '0';
				end if;
			
			end if;
		end if;
	end process; -- end v_ctrl
	
	
	frame_gen: process(clk)
	begin
		if rising_edge(clk) then
			if h_act = '1' and v_act = '1' then
				de <= '1';
				r <= std_logic_vector(to_unsigned(h_count, 12))(9 downto 2);
				g <= std_logic_vector(to_unsigned(v_count, 12))(9 downto 2);
				b <= std_logic_vector(to_unsigned(h_count, 12))(9 downto 2);
			else
				de <= '0';
				r <= (others => '0');
				g <= (others => '0');
				b <= (others => '0');
			end if;
		end if;
	end process; -- end frame_gen

end behavioral ; -- behavioral
```

When connecting a display to the board, I could see the expected results, so I concluded the driver was working as intended.


# RGB to grayscale converter

I decided to convert the RGB video stream coming from the camera (pattern generator) to a grayscale stream. There are two reasons to this. 

1. I don't need the colors when doing edge detections (with the Sobel or Laplacian kernel).
2. There are less data to handle when using grayscale.

To do the conversion, I searched for an efficient way to convert RGB to Gray on FPGA. I found [this paper](https://www.sciencedirect.com/science/article/pii/S187705092031200X?ref=cra_js_challenge&fr=RR-1), and decided to implement it. They explain in the paper that the gray value of a pixel is composed of 28.1% of red, 56.2% of green and 9.3% of blue, this is used in the "rgb2gray" function in MATLAB.

> NOTE
> 
> After testing the grayscale conversion, I decided that the blue was not high enough, and added more blue. 


This is the block diagram of the proposed technique.

![rgb2gray](/assets/convolution/rgb2gray.jpg)


## VHDL Implementation

```vhdl
library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity rgbgray is 
	port (
		r:			in		std_logic_vector(7 downto 0);
		g:			in		std_logic_vector(7 downto 0);
		b:			in		std_logic_vector(7 downto 0);
		
		gray:		out		std_logic_vector(7 downto 0)
	);
end rgbgray;

architecture rtl of rgbgray is

	signal r1: std_logic_vector(7 downto 0);
	signal r2: std_logic_vector(7 downto 0);
	signal g1: std_logic_vector(7 downto 0);
	signal g2: std_logic_vector(7 downto 0);
	signal b1: std_logic_vector(7 downto 0);
	signal b2: std_logic_vector(7 downto 0);

begin
	
	r1 <= "00" 		& r(7 downto 2); -- shift right by 2
	r2 <= "00000" 	& r(7 downto 5); -- shift right by 5
	g1 <= "0" 		& g(7 downto 1); -- shift right by 1
	g2 <= "0000" 	& g(7 downto 4); -- shift right by 4
	b1 <= "00" 		& b(7 downto 2); -- shift right by 2
	b2 <= "00000" 	& b(7 downto 5); -- shift right by 5

	-- Add all the values together
	gray <= std_logic_vector(unsigned(r1) + unsigned(r2) + unsigned(g1) + unsigned(g2) + unsigned(b1) + unsigned(b2));
	
end rtl;
```

## Simulating the design

To verify that I implemented correctly the design, I simulated it with [ghdl](https://github.com/ghdl/ghdl), and checked the waveform using [GTKWave](https://github.com/gtkwave/gtkwave). I wrote a very basic testbench and tested the conversion. In the paper they give an example conversion with the following values : 

- R : `b11010110`
- G : `b11111110`
- B : `b01011100`

They also give the intermediate R1 and R2 values (values after shifting the bits). The result of this conversion is : `b11010000`.

![graysim](/assets/convolution/gray_simulation.jpg)

We can see in the simulation that I have the same result as the one in the example given in the paper. I also tested another value and verified it by doing the calculations by hand using python.

> NOTE
> 
> The tests were done before adding more blue.


At this point, I could display anything on a screen using the HDMI Driver. I could also feed the data through the grayscale converter and see the result on the screen.


# Convolution engine

As mentioned in the introduction, the convolution is a very important algorithm for image processing. The gif shows how a kernel is applied on a matrix. Different kernels are used to obtain different results (edge detection, noise filtering, blur effect, ...).

![conv_example](/assets/convolution/conv_example.gif)

The kernel used in the gif can sharpen an image. I have tested this kernel in python on an image, I also tested a sobel filter (edge detection) on the same image. The python code for this is the following : 

```python
import cv2
import numpy as np

plane = cv2.imread("plane.jpg", 0)

kernel = np.array([ [ 0, -1,  0],
					[-1,  5, -1],
					[ 0, -1,  0]])

plane_sharp = cv2.filter2D(plane, -1, kernel=kernel)

plane_sobel_x = cv2.Sobel(plane, -1, 1, 0)
plane_sobel_y = cv2.Sobel(plane, -1, 0, 1)
plane_sobel = ((plane_sobel_x + plane_sobel_y) > 64) * 255

cv2.imwrite("plane_sharp.jpg", plane_sharp)
cv2.imwrite("planel_sobel.jpg", plane_sobel)

```

The pictures are presented in the following order : the original, the sharpened and the edge detected with the sobel filter.

![plane](/assets/convolution/plane.jpg)

![plane](/assets/convolution/plane_sharp.jpg)

![plane](/assets/convolution/plane_sobel.jpg)