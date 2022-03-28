import React from "react";
import { SimulationCanvas } from "../App";
import { useSimulation } from "../simulation";

export const StrangeFluidSimulation = () => {
  useSimulation(
    "webgl",
    `
    vec4 get_pixel(float x_offset, float y_offset)
    {
      vec2 gravity = vec2(0.0, 0.001);
      return texture2D(self, gravity + (gl_FragCoord.xy / resolution.xy) + (vec2(x_offset, y_offset) / resolution.xy));
    }

    float step_simulation(vec2 uv)
    {
        float val = get_pixel(0.0, 0.0).r;
        
        val += random_float(uv, 0.0)*val*0.15; // errosion
        
        val = get_pixel(
          sin(get_pixel(val, 0.0).r  - get_pixel(-val, 0.0) + PI).r  * val * 0.4, 
            cos(get_pixel(0.0, -val).r - get_pixel(0.0 , val) - PI2).r * val * 0.4
        ).r;
        if (mouse.z > 0.0) 
          val += smoothstep(length(resolution.xy)/10.0, 0.5, length(mouse.xy - gl_FragCoord.xy));
        
        val *= 1.001;
        
        return val;
    }

    void main()
    {    
        vec2 uv = gl_FragCoord.xy/resolution.xy;
        float val = step_simulation(uv);
    
        if(frame == 0)
            val = 
              random_float(uv, 0.0)*length(resolution.xy)/100.0 + 
              smoothstep(length(resolution.xy)/2.0, 0.5, length(resolution.xy * 0.5 - gl_FragCoord.xy))*25.0;
                    
        gl_FragColor.r = val;
    }
  `,
    `
    void main() {
        vec2 uv = gl_FragCoord.xy / resolution;
        float val = texture2D(self, uv).r;
        
        vec4 color = pow(vec4(cos(val), tan(val), sin(val), 1.0) * 0.5 + 0.5, vec4(0.5));
  
        vec3 e = vec3(vec2(1.0)/resolution.xy,0.0);
        float p10 = texture2D(self, uv-e.zy).x;
        float p01 = texture2D(self, uv-e.xz).x;
        float p21 = texture2D(self, uv+e.xz).x;
        float p12 = texture2D(self, uv+e.zy).x;
            
        vec3 grad = normalize(vec3(p21 - p01, p12 - p10, 1.));
        vec3 light = normalize(vec3(.2,-.25,.7));
        float diffuse = dot(grad,light);
        float spec = pow(max(0.,-reflect(light,grad).z),32.0);
        
        gl_FragColor = (color * diffuse) + spec;
        
        gl_FragColor.a = 1.0; 
    }
    `
  );

  return <SimulationCanvas />;
};
