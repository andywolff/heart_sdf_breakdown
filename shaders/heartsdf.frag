#version 460 core

#include <flutter/runtime_effect.glsl>

precision mediump float;

uniform vec2 resolution;
uniform float drawStepIndex; // Flutter's shader uniforms API doesn't support
                             // uints so we use a float instead.
uniform float shouldRenderDebug; // Flutter's shader uniforms API doesn't
                                 // support bools so we use a float instead. 0.0
                                 // is false, non-zero is true.

out vec4 fragColor;

const vec3 flutterBlue = vec3(5, 83, 177) / 255;
const vec3 flutterNavy = vec3(4, 43, 89) / 255;
const vec3 flutterSky = vec3(2, 125, 253) / 255;
const vec3 pink = vec3(255, 105, 180) / 255;
const vec3 black = vec3(0);

// dot2 and sdHeart from https://iquilezles.org/articles/distfunctions2d/
// // The MIT License
// Copyright © 2021 Inigo Quilez
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions: The above copyright
// notice and this permission notice shall be included in all copies or
// substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS",
// WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
// TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
// FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
// THE USE OR OTHER DEALINGS IN THE SOFTWARE.

float dot2(vec2 v) { return dot(v, v); }

float sdCircle(vec2 p, float r) { return length(p) - r; }

float sdHeart(in vec2 p) {
  vec2 centerTopInnerVertex = vec2(0.0, 1.0);
  vec2 circleCenter = vec2(0.25, 0.75);

  // SDFs are constructed by calculating and manipulating distance. Negative
  // values are inside the shape. So we start with a point and then manipulate
  // it to get distances which describe a heart shape. Read the operations from
  // bottom to top.

  p.x = abs(p.x); // 5. Mirror horizontally across x=0. This will copy the right
                  // half of the heart (x>=0) to the left half of the heart.

  // Check that we're beyond the line from center top inner vertex (0,1) toward
  // (1,0). Note that this line passes through the center of the cirle at (0.25,
  // 0.75).

  if (p.x + p.y > 1.0)
    return
        // 4. Expand the circle by subtracting its radius
        // sqrt(2)/4 is the radius of the circle because it is shortened from
        // the distance between (0,1) and (0.25, 0.75). Geometry reasons?
        -sqrt(dot2(centerTopInnerVertex -
                   circleCenter)) + // Inigo Quilez shortened this to
                                    // sqrt(2.0)/4.0 which is equivalent.
        // 3. Distance to the point at (0.25,0.75) which shall be the center of
        // the circle
        sqrt(dot2(p - circleCenter));

  return
      // 2. Negate distance for points above the line x-y=0 (bottom right).
      //    This will cause points below this line to be considered within the
      //    heart.
      sign(p.x - p.y) *
      sqrt(    // Convert from squared distance to distance.
          min( // Union the two squared distances by taking the minimum.
               // 1. Squared distance to the top center point of the heart.
               // Without this, we would have an incorrect distance calculation
               // inside the heart near this point.
              dot2(p - centerTopInnerVertex),
              // 0. Squared distance to the the bottom right edge of the heart.
              // This is the ray from (0,0) along the line x+y = 0.
              // The max(0) turns this from a line to a ray, correcting the
              // distance calculation beyond the bottom point of the heart.
              dot2(p - 0.5 * max(0.0, p.x + p.y))));
}

float sdHeartStep0(in vec2 p) {
  return sqrt( // Convert from squared distance to distance.

      // 0. Squared distance to the the bottom right edge of the heart.
      // This is the line x+y = 0.
      dot2(p - 0.5 * (p.x + p.y)));
}

float sdHeartStep1(in vec2 p) {
  return sqrt( // Convert from squared distance to distance.

      // 0. Squared distance to the the bottom right edge of the heart.
      // This is the ray from (0,0) along the line x+y = 0.
      // The max(0) turns this from a line to a ray, correcting the
      // distance calculation beyond the bottom point of the heart.
      dot2(p - 0.5 * max(0.0, p.x + p.y)));
}

float sdHeartStep2(in vec2 p) {
  vec2 centerTopInnerVertex = vec2(0.0, 1.0);
  return sqrt( // Convert from squared distance to distance.
      min(     // Union the two squared distances by taking the minimum.
               // 1. Squared distance to the top center point of the heart.
               // Without this, we would have an incorrect distance calculation
               // inside the heart near this point.
          dot2(p - centerTopInnerVertex),
          // 0. Squared distance to the the bottom right edge of the heart.
          // This is the ray from (0,0) along the line x+y = 0.
          // The max(0) turns this from a line to a ray, correcting the
          // distance calculation beyond the bottom point of the heart.
          dot2(p - 0.5 * max(0.0, p.x + p.y))));
}

float sdHeartStep3(in vec2 p) {
  vec2 centerTopInnerVertex = vec2(0.0, 1.0);
  vec2 circleCenter = vec2(0.25, 0.75);

  return
      // 2. Negate distance for points above the line x-y=0 (bottom right).
      //    This will cause points below this line to be considered within the
      //    heart.
      sign(p.x - p.y) *
      sqrt(    // Convert from squared distance to distance.
          min( // Union the two squared distances by taking the minimum.
               // 1. Squared distance to the top center point of the heart.
               // Without this, we would have an incorrect distance calculation
               // inside the heart near this point.
              dot2(p - centerTopInnerVertex),
              // 0. Squared distance to the the bottom right edge of the heart.
              // This is the ray from (0,0) along the line x+y = 0.
              // The max(0) turns this from a line to a ray, correcting the
              // distance calculation beyond the bottom point of the heart.
              dot2(p - 0.5 * max(0.0, p.x + p.y))));
}

float sdHeartStep4(in vec2 p) {
  vec2 centerTopInnerVertex = vec2(0.0, 1.0);
  vec2 circleCenter = vec2(0.25, 0.75);

  // Check that we're beyond the line from center top inner vertex (0,1) toward
  // (1,0). Note that this line passes through the center of the cirle at (0.25,
  // 0.75).

  if (p.x + p.y > 1.0)
    return
        // 3. Distance to the point at (0.25,0.75) which shall be the center of
        // the circle
        sqrt(dot2(p - circleCenter));

  return
      // 2. Negate distance for points above the line x-y=0 (bottom right).
      //    This will cause points below this line to be considered within the
      //    heart.
      sign(p.x - p.y) *
      sqrt(    // Convert from squared distance to distance.
          min( // Union the two squared distances by taking the minimum.
               // 1. Squared distance to the top center point of the heart.
               // Without this, we would have an incorrect distance calculation
               // inside the heart near this point.
              dot2(p - centerTopInnerVertex),
              // 0. Squared distance to the the bottom right edge of the heart.
              // This is the ray from (0,0) along the line x+y = 0.
              // The max(0) turns this from a line to a ray, correcting the
              // distance calculation beyond the bottom point of the heart.
              dot2(p - 0.5 * max(0.0, p.x + p.y))));
}

float sdHeartStep5(in vec2 p) {
  vec2 centerTopInnerVertex = vec2(0.0, 1.0);
  vec2 circleCenter = vec2(0.25, 0.75);

  // Check that we're beyond the line from center top inner vertex (0,1) toward
  // (1,0). Note that this line passes through the center of the cirle at (0.25,
  // 0.75).

  if (p.x + p.y > 1.0)
    return
        // 4. Expand the circle by subtracting its radius
        // sqrt(2)/4 is the radius of the circle because it is shortened from
        // the distance between (0,1) and (0.25, 0.75). Geometry reasons?
        -sqrt(dot2(centerTopInnerVertex -
                   circleCenter)) + // Inigo Quilez shortened this to
                                    // sqrt(2.0)/4.0 which is equivalent.
        // 3. Distance to the point at (0.25,0.75) which shall be the center of
        // the circle
        sqrt(dot2(p - circleCenter));

  return
      // 2. Negate distance for points above the line x-y=0 (bottom right).
      //    This will cause points below this line to be considered within the
      //    heart.
      sign(p.x - p.y) *
      sqrt(    // Convert from squared distance to distance.
          min( // Union the two squared distances by taking the minimum.
               // 1. Squared distance to the top center point of the heart.
               // Without this, we would have an incorrect distance calculation
               // inside the heart near this point.
              dot2(p - centerTopInnerVertex),
              // 0. Squared distance to the the bottom right edge of the heart.
              // This is the ray from (0,0) along the line x+y = 0.
              // The max(0) turns this from a line to a ray, correcting the
              // distance calculation beyond the bottom point of the heart.
              dot2(p - 0.5 * max(0.0, p.x + p.y))));
}

float sdHeartStepMinus1(in vec2 p) {
  vec2 centerTopInnerVertex = vec2(0.0, 1.0);
  vec2 circleCenter = vec2(0.25, 0.75);

  p.x = abs(p.x);

  if (p.x + p.y > 1.0)
    return -sqrt(dot2(centerTopInnerVertex - circleCenter)) +
           sqrt(dot2(p - circleCenter));

  return sign(p.x - p.y) *
         sqrt(min(dot2(p - centerTopInnerVertex),
                  // What if we remove the max(0, p.x + p.y)? This would leave
                  // the bottom right edge as a line instead of a ray.
                  dot2(p - 0.5 * (p.x + p.y))));
}

float sdHeartStepMinus2(in vec2 p) {
  vec2 centerTopInnerVertex = vec2(0.0, 1.0);
  vec2 circleCenter = vec2(0.25, 0.75);

  p.x = abs(p.x);

  if (p.x + p.y > 1.0)
    return -sqrt(dot2(centerTopInnerVertex - circleCenter)) +
           sqrt(dot2(p - circleCenter));

  return sign(p.x - p.y) *
         // What if we left out the top vertex here?
         sqrt(dot2(p - 0.5 * max(0.0, p.x + p.y)));
}

void main() {
  vec2 st = FlutterFragCoord().xy / resolution.xy;

  vec3 color = vec3(0.0);
  vec3 percent = vec3((st.x + st.y) / 2);

  color =
      mix(mix(flutterSky, flutterBlue, percent * 2),
          mix(flutterBlue, flutterNavy, percent * 2 - 1), step(0.5, percent));

  // Draw the heart.
  st = (st - vec2(0.5, 0.5)) *
       vec2(2.0, -2.0);      // remap from 0,1..1,0 to -1,-1..1,1
  st = st + vec2(0.0, 0.25); // move the heart down a bit
  st *= 2.0;                 // Make the heart smaller

  float heart = 0.0;
  if (drawStepIndex <= 1.0) {
    heart =
        mix(sdHeartStep0(st), sdHeartStep1(st), clamp(drawStepIndex, 0.0, 1.0));
  } else if (drawStepIndex <= 2.0) {
    heart = mix(sdHeartStep1(st), sdHeartStep2(st),
                clamp(drawStepIndex - 1.0, 0.0, 1.0));
  } else if (drawStepIndex <= 3.0) {
    heart = mix(sdHeartStep2(st), sdHeartStep3(st),
                clamp(drawStepIndex - 2.0, 0.0, 1.0));
  } else if (drawStepIndex <= 4.0) {
    heart = mix(sdHeartStep3(st), sdHeartStep4(st),
                clamp(drawStepIndex - 3.0, 0.0, 1.0));
  } else if (drawStepIndex <= 5.0) {
    heart = mix(sdHeartStep4(st), sdHeartStep5(st),
                clamp(drawStepIndex - 4.0, 0.0, 1.0));
  } else if (drawStepIndex <= 6.0) {
    heart = mix(sdHeartStep5(st), sdHeart(st),
                clamp(drawStepIndex - 5.0, 0.0, 1.0));
  } else if (drawStepIndex <= 7.0) {
    heart = mix(sdHeart(st), sdHeartStepMinus1(st),
                clamp(drawStepIndex - 6.0, 0.0, 1.0));
  } else if (drawStepIndex <= 8.0) {
    heart = mix(sdHeartStepMinus1(st), sdHeartStepMinus2(st),
                clamp(drawStepIndex - 7.0, 0.0, 1.0));
  } else if (drawStepIndex <= 9.0) {
    heart = mix(sdHeartStepMinus2(st), sdHeart(st),
                clamp(drawStepIndex - 8.0, 0.0, 1.0));
  } else {
    heart = sdHeartStepMinus2(st);
  }

  if (shouldRenderDebug <= 0.0) {
    float heartFilledToExpandedBorderEdge = smoothstep(0.05, 0.07, heart);
    float heartFilledToFeatheredEdge = smoothstep(0.01, 0.02, heart);
    color = mix(black, color, heartFilledToExpandedBorderEdge);
    color = mix(pink, color, heartFilledToFeatheredEdge);
  }

  // Visualize the heart distance with a black and white inside vs outside
  // visualization color = clamp(0.0, 1.0, heart));

  // visualize the heart distance with a repeating gradient
  if (shouldRenderDebug > 0.0) {
    // // Union heart with a circle to show the draw step index.
    // heart =
    //     min(heart,
    //         sdCircle(
    //             // Move the circle from left to right as the draw step index
    //             // increases.
    //             st + vec2(0.5, 1.0) - vec2(0.5 * drawStepIndex, 0.0),
    //             // Circle radius should be 0.2, but when between steps it
    //             should
    //             // expand plus or minus 0.05 to create a pulsing effect.
    //             0.2 - 0.05 * sin(6.28 * drawStepIndex)));

    color.b = mix(0.25, 0.75, mod(12.0 * heart, 1.0));
    color.g = 0.0; // zero out green channel
    color.r =
        1.0 -
        step(0.0, heart); // replace red channel with a binary visualization of
                          // the inside vs outside of the heart
  }

  fragColor = vec4(color, 1);
}
