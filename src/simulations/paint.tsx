import React from "react";
import { SimulationCanvas } from "../App";
import { useSimulation } from "../simulation";

export const PaintSimulation = () => {
  useSimulation(
    "webgl",
    `
    vec2 get_attraction(vec2 uv)
    {
        vec2 scale = (1.0 / resolution.xy);

        vec2 res = vec2(0.0);
        const float samples = 1.0;

        for (float dist = 0.0; dist <= 1.0; dist += 1.0/DISTANCE_SAMPLES) {
            for (float circle_pos = -PI; circle_pos <= PI; circle_pos += 1.0/CIRCLE_SAMPLES) {

                vec2 offset = vec2(sin(circle_pos), cos(circle_pos));

                float seed = time + dist + circle_pos;
                //offset += random_vec2_tex(uv, vec2(seed + 1.0, seed + 2.0))*0.25;

                offset *= dist*SIZE;
                offset *= scale;

                float val = pow(texture2D(self, uv + offset).r, 2.0);

                res += offset * val;
            }
        }


        res /= DISTANCE_SAMPLES * CIRCLE_SAMPLES;
        res *= 1.0;

        return res;
    }

    void main()
    {
        vec2 uv = gl_FragCoord.xy/resolution.xy;

        gl_FragColor.r = texture2D(self, uv).r*0.25;

        if (mouse.z > 0.0) {
          gl_FragColor.r += smoothstep(100.0, 0.5, length(mouse.xy - gl_FragCoord.xy)) * 0.05;
        }

        if (gl_FragColor.r == 0.0) {
          discard;
        }

        /*float rot = radians(180.0);

        uv -= 0.5;
        uv *= mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
        uv += 0.5;*/



        gl_FragColor.r += texture2D(self, uv - get_attraction(uv) ).r;

        gl_FragColor.r *= 0.99;

        //gl_FragColor.r = sin(gl_FragColor.r);
    }`,
    `
      void main()
      {
          vec2 uv = gl_FragCoord.xy/resolution.xy;
          float v = texture2D(self, uv).r;

          vec3 color = hsv2rgb(vec3(v/10.0 - 0.05, abs(pow(v, 0.25)), abs(v)));
          vec3 e = vec3(vec2(1.0) / resolution.xy, 0.0);
          vec3 grad = normalize(vec3(
            texture2D(self, uv + e.xz).x - texture2D(self, uv - e.xz).x,
            texture2D(self, uv + e.zy).x - texture2D(self, uv - e.zy).x, 1.0));
          vec3 light = vec3(0.26, -0.32, 0.91);
          float diffuse = dot(grad, light);
          float spec = pow(max(0.0, -reflect(light, grad).z), 64.0);

          gl_FragColor.rgb = (color * diffuse) + vec3(spec*2.0, spec, spec*-1.0);

          //gl_FragColor.rgb = vec3(v,v,v);
          gl_FragColor.a = 1.0;
      }
    `
  );

  return <SimulationCanvas />;
};
