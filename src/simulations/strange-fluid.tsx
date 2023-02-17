// BLACK BACKGROUND TO AVOID SQUARE SHAPE
import door_image from "../assets/effect-logo-2.png";

import React from "react";
import { SimulationCanvas } from "../App";
import { useSimulation } from "../simulation";

export const StrangeFluidSimulation = () => {
  useSimulation(
    "webgl",
    `
    vec4 get_pixel(float x_offset, float y_offset)
    {
      vec2 gravity = vec2(0.0, 0.0);
      return texture2D(self, gravity + (gl_FragCoord.xy / resolution.xy) + (vec2(x_offset, y_offset) / resolution.xy));
    }

    float step_simulation(vec2 uv)
    {
        float val = get_pixel(0.0, 0.0).r;

        float s = length(texture2D(door_tex, uv * vec2(1.0, -1.0)));

        
        val += random_float(uv+vec2(val, -val), 0.1)*val*0.5; // errosion
        
        val = get_pixel(
          sin(get_pixel(val, 0.0).r  - get_pixel(-val, 0.0) + PI).r  * val * 0.14, 
            cos(get_pixel(0.0, -val).r - get_pixel(0.0 , val) - PI2).r * val * 0.14
        ).r;
        
        val += (s);

        if (mouse.z > 0.0) 
          val += smoothstep(length(resolution.xy)/5.0, 0.7, length(mouse.xy - gl_FragCoord.xy));
        
val *=0.9;

        return val;
    }

    void main()
    {    
        vec2 uv = gl_FragCoord.xy/resolution.xy;
        float val = step_simulation(uv);
    
        if(frame == 0)
            val = 
              1.0;
                    
        gl_FragColor.r = val;
    }
  `,
    `
    void main() {
        vec2 uv = gl_FragCoord.xy / resolution;
        float val = texture2D(self, uv).r*0.5 + 1.5;
 
        vec4 color = pow(vec4(cos(val), tan(val), sin(val), 1.0) * 0.5 + 0.5, vec4(0.25));
        color = max(color, vec4(0.0));
        color = min(color, vec4(1.0));
        
        color = pow(color, vec4(0.86)) * 0.9;
  
        vec3 e = vec3(vec2(1.0)/resolution.xy,0.0);
        float p10 = texture2D(self, uv-e.zy).x;
        float p01 = texture2D(self, uv-e.xz).x;
        float p21 = texture2D(self, uv+e.xz).x;
        float p12 = texture2D(self, uv+e.zy).x;
            
        vec3 grad = normalize(vec3(p21 - p01, p12 - p10, 1.));
        vec3 light = normalize(vec3(.2,-.25,.7));
        float diffuse = pow(dot(grad,light), 1.5);
        float spec = pow(max(0.,-reflect(light,grad).z),32.0);
        
        gl_FragColor = (color * diffuse ) + spec;
        
        gl_FragColor.a = 1.0; 
    }
    `
    , [
      {
        name: "door_tex",
        img: door_image,
      }
    ]
  );

  return <SimulationCanvas />;
};
