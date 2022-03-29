import React from "react";
import { SimulationCanvas } from "../App";
import { useSimulation } from "../simulation";
import { glsl } from "../webgl";

export const BlobSimulation = () => {
  useSimulation(
    "webgl",
    `
        const float TEMPERATURE = 0.25;
        const float RADIUS = 1.53;
   
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
            float door = texture2D(door_tex, -uv).r;
            
            {	
                vec2 muv = noise.xy;
                
                vec2 p = uv - muv;
                float r = length(p);
                float a = atan(p.y, p.x);
                r = pow(r*2.0, 1.0 + height * 0.05);

                r = r + (door)/100.0;

                p = r * vec2(cos(a)*0.5, sin(a)*0.5);
                uv = p + muv;
            }
                              
            if (frame == 0)
            {
                gl_FragColor.r = random_float(uv, 0.0);
                return;
            }


            
            float val = texture2D(self, uv).r;

            float door2 = clamp(pow((door), 1.3) + texture2D(self, uv).b*1.01, 0.0, 1.0)*0.98;


            float avg = get_average(uv, height*-0.005);
            gl_FragColor.r = sin(avg * (2.3 + TEMPERATURE + height*2.0)) + sin(val);

            gl_FragColor.r *= -door2+1.0;
            gl_FragColor.b = door2;


            
            if (mouse.z > 0.0) 
                gl_FragColor.r += smoothstep(length(resolution.xy)/5.0, 0.5, length(mouse.xy - gl_FragCoord.xy)) * sin(time*10.0);
        } 
  `,

    glsl`
    void main() {
        vec2 uv = gl_FragCoord.xy / resolution;

        float v = texture2D(self, uv).r;
        float b = -clamp(texture2D(self, uv).b, 0.0, 1.0)+1.0;
        v *= 0.5;
        v = v * 0.5 + 0.5;
        v = clamp(v, 0.0, 1.0);

        vec3 e = vec3(vec2(1.0)/resolution.xy,0.0);
        float p10 = texture2D(self, uv-e.zy).x;
        float p01 = texture2D(self, uv-e.xz).x;
        float p21 = texture2D(self, uv+e.xz).x;
        float p12 = texture2D(self, uv+e.zy).x;
            
        vec3 grad = normalize(vec3(p21 - p01, p12 - p10, 1.));
        vec3 light = normalize(vec3(.2,-.25,.7));
        float diffuse = dot(grad,light);
        float spec = pow(max(0.,-reflect(light,grad).z),32.0);
                
        vec3 color = vec3(sin(v*2.0), sin(v*5.0), cos(v*5.0+PI));

        color.r = pow(color.r, 0.5);
        color.g = pow(color.g, 0.5);
        color.b = pow(color.b, 0.5);

        

        gl_FragColor.rgb = ((color * diffuse) + spec) * pow(b, 1.0);

        //gl_FragColor.rgb = vec3(1.0)*texture2D(self, uv).b;

        gl_FragColor.a = 1.0;
      }          
    `
  );

  return <SimulationCanvas />;
};
