---
layout: post
title:  "Raycasting"
description: Raycasting in rust
date:   2023-01-15 21:03:36 +0530
categories: Software Rust Raycasting
navig: 
  - title: Github Repo
    url: https://github.com/suguuss/raycasting
  - title: Live Demo
    url: /raycasting/demo/
---

# Introduction

The goal of this project was to learn rust by making a simple raycasting implementation and compiling it to web assembly.

## Raycasting

Raycasting is a rendering technique to create a 3D view in a 2D window. We can fake this perspective by drawing smaller walls the furter they are from the camera. Drawing walls with a darker color also helps to fake the perspective.

{% include image.html url="/assets/raycasting/raycasting_example.png" alt="raycasting_example" %}

# Program

## Format of the map

The scene is designed by the user in a text file. An exemple of the file can be seen below. There a three arguments at the beginning of the file. The first two are the width and the height, and the last one is the fov of the player. The map is built of 0's and 1's and the initital player position is the 2. The 1's represents the walls.

```
16,16,50
1111111111111111
1111111111100001
1000010010100001
1000010010100001
1000000010100001
1000000000000001
1000020000000001
1000000000000001
1000000000000001
1000000011000001
1000001111000001
1000001100000001
1000000000000001
1000000000000001
1000000000000001
1111111111111111
```

## Finding the walls



## Drawing the walls


# Sources

[macroquad](https://github.com/not-fl3/macroquad)
