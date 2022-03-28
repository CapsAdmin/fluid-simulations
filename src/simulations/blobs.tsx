import React from "react";
import { SimulationCanvas } from "../App";
import { useSimulation } from "../simulation";

export const BlobSimulation = () => {
  useSimulation(
    "webgl",
    `
        const float TEMPERATURE = 2.0;
        const float RADIUS = 1.33;
   
        float get_average(vec2 uv, float size)
        {
            const float points = 14.0;
            const float Start = 2.0 / points;
            vec2 scale = (RADIUS * 5.0 / resolution.xy) + size;
            float res = texture2D(self, uv).r;
            for (float point = 0.0; point < points; point++)
            {
                float r = (PI * 2.0 * (1.0 / points)) * (point + Start);
                res += texture2D(self, uv + vec2(sin(r), cos(r)) * scale).r;
            }
            res /= points;
            return res;
        }
        void main()
        {
            vec2 uv = gl_FragCoord.xy/resolution.xy;

            
            vec3 noise = texture2D(noise_tex, time*0.001 + uv*0.015*0.15).rgb;

            float height = (noise.b*2.0-1.0) * 0.01;

            height -= texture2D(door_tex, -uv).r;
            
            {	
                vec2 muv = noise.xy;
                
                vec2 p = uv - muv;
                float r = length(p);
                float a = atan(p.y, p.x);
                r = pow(r*2.0, 1.0 + height * 0.05);
                p = r * vec2(cos(a)*0.5, sin(a)*0.5);
                uv = p + muv;
            }
                              
            if (frame == 0)
            {
                gl_FragColor.r = random_float(uv, 0.0);
                return;
            }
            
            float val = texture2D(self, uv).r;
            float avg = get_average(uv, height*-0.005);
            gl_FragColor.r = sin(avg * (2.3 + TEMPERATURE + height*2.0)) + sin(val);

            
            if (mouse.z > 0.0) 
                gl_FragColor.r += smoothstep(length(resolution.xy)/5.0, 0.5, length(mouse.xy - gl_FragCoord.xy)) * sin(time*10.0);
        } 
  `,
    `
    void main() {
        float v = texture2D(self, gl_FragCoord.xy/resolution.xy).r;
        v *= 0.5;
        v = v * 0.5 + 0.5;
        v = clamp(v, 0.0, 1.0);
        
        gl_FragColor.r = v*1.25;
        gl_FragColor.g = sin(v*0.1)*5.0+v;
        gl_FragColor.b = pow(v*5.0, 0.5)*0.26;
        gl_FragColor.a = 1.0;
      }          
    `
  );

  return <SimulationCanvas />;
};
