import React, { useState, useEffect } from 'react';
import './App.css';
import * as twgl from "twgl.js"
import noise_image from './noise.png';

const positionFromMouseEvent = (event: {clientX: number, clientY: number, target: any}) => {
  let target = event.target as HTMLCanvasElement

  if (!target) {
    return [0,0]
  }
  let rect = target.getBoundingClientRect()

  let x = event.clientX - rect.left
  let y = event.clientY - rect.top

  x = x * target.width  / target.clientWidth
  y = y * target.height / target.clientHeight

  return [x, y]  
}

const useWebGL = (
  id: string, 
  init: (gl: WebGL2RenderingContext) => {
    render: (time: number) => any, 
    resize: (width: number, height: number) => void, 
    shutdown: () => void
  }
  ) => {
  let [webGLContext, setWebGLContext] = useState<WebGL2RenderingContext | null>(null)

  useEffect(() => {
    let element = document.getElementById(id) as HTMLCanvasElement

    if (!element) {
      return
    };

    if (element.tagName.toLowerCase() != "canvas") {
      return;
    }

    let gl = element.getContext("webgl2", { antialias: false, depth: false })
    
    if (!gl) {
      return;
    }

    let {render, resize, shutdown} = init(gl)
    
    if (render) {
      let loop: (time: number) => void

      loop = (time: number) => {

        if (twgl.resizeCanvasToDisplaySize(element)) {
          resize(element.width, element.height)
        }

        if (!render(time)) {
          requestAnimationFrame(loop)  
        } else {
          shutdown()
        }
      } 
      requestAnimationFrame(loop)
    }

    twgl.addExtensionsToContext(gl)
    setWebGLContext(gl)

    return () => {
      shutdown()
    }
  },[id])

  return webGLContext
}

const useSimulation = (id: string, simulation: string, shade: string) => {
  return useWebGL(id, (gl) => {
    let rectangle = twgl.createBufferInfoFromArrays(gl, {
      position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
    });

    let buffers: twgl.FramebufferInfo[] = []
    for (let i = 0; i < 2; i++) {
      buffers[i] = twgl.createFramebufferInfo(
        gl,
        [{ 
          format: gl.RED, 
          internalFormat: gl.R8,
          type: gl.BYTE, 
          mag: gl.LINEAR, 
          min: gl.LINEAR,
          wrap: gl.REPEAT,
        },],  
        gl.canvas.width,
        gl.canvas.height
      )
    }

    const vertex_program = `
      attribute vec4 position;
      void main() {
        gl_Position = position;
      }
    `

    const program_header = `
      precision highp float;      
      uniform float time;
      uniform vec2 resolution;
      uniform sampler2D noise_tex;
    `

    const simulationProgram = twgl.createProgramInfo(gl, [
      vertex_program,
      program_header + `
        uniform sampler2D self;
        uniform int frame;
        uniform vec3 mouse;

      ` + simulation
    ])

    const shadeProgram = twgl.createProgramInfo(gl, [
      vertex_program,
      program_header + `
        uniform sampler2D self;

      ` + shade
    ])

    const noise_tex = twgl.createTexture(gl, {
      src: noise_image,
    })

    const mouse_pos = {x: 0, y: 0, z: 0}

    const mouse_event = (evt: MouseEvent) => {
      let [x, y] = positionFromMouseEvent(evt)
      mouse_pos.x = x
      mouse_pos.y = y
      mouse_pos.z = evt.buttons;
    }

    const touch_event = (evt: TouchEvent) => {
      let [x, y] = positionFromMouseEvent(evt.touches.item(0)!)
      mouse_pos.x = x
      mouse_pos.y = y
      mouse_pos.z = 1;
    }

    const stop_event = () => {
      mouse_pos.z = 0;
    }

    gl.canvas.addEventListener("mousemove", mouse_event as (evt: Event) => void, false);
    gl.canvas.addEventListener("mousedown", mouse_event as (evt: Event) => void, false);

    gl.canvas.addEventListener("touchmove", touch_event as (evt: Event) => void, false);
    gl.canvas.addEventListener("ontouchstart", touch_event as (evt: Event) => void, false);

    gl.canvas.addEventListener("mouseup", stop_event, false);
    gl.canvas.addEventListener("touchend", stop_event, false);
    gl.canvas.addEventListener("touchcancel", stop_event, false);

    let frame = 0

    return {
       render: (time) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, buffers[0].framebuffer);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  
        const uniforms = {
          resolution: [gl.canvas.width, gl.canvas.height],
          self: buffers[1].attachments[0],
          frame: frame,
          mouse: [
            mouse_pos.x, 
            -mouse_pos.y + gl.canvas.height, 
            mouse_pos.z
          ],
          time: time / 1000,
          noise_tex: noise_tex,
        };
  
        gl.useProgram(simulationProgram.program);
        twgl.setBuffersAndAttributes(gl, simulationProgram, rectangle);
        twgl.setUniforms(simulationProgram, uniforms);
        twgl.drawBufferInfo(gl, rectangle);
  
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  
      [buffers[0], buffers[1]] = [buffers[1], buffers[0]] 
  
      frame = frame + 1
  
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);   
  
      gl.useProgram(shadeProgram.program);
      twgl.setBuffersAndAttributes(gl, shadeProgram, rectangle);
      twgl.setUniforms(shadeProgram, {
        self: buffers[1].attachments[0],
        resolution: [gl.canvas.width, gl.canvas.height],
        time: time,
        noise_tex: noise_tex,
      });
      twgl.drawBufferInfo(gl, rectangle)
      },
      resize: (width, height) => {
        for (let buffer of buffers) {
          twgl.resizeFramebufferInfo(gl, buffer, buffer.attachments)
        }
      },
      shutdown: () => {
        console.log("shutdown!")
      }
    }
  })
}

const App = () => {  

  let common = `
    const float PHI = 1.61803398874989484820459;  // Φ = Golden Ratio   
    const float PI = radians(180.0);
    const float SIZE = 64.0;

    const float DISTANCE_SAMPLES = 16.0;
    const float CIRCLE_SAMPLES = 16.0;

    float gold_noise(vec2 xy, float seed){
      return fract(tan(distance(xy*PHI, xy)*seed)*xy.x)*2.0 - 1.0;
    }

    vec2 gold_noise(vec2 uv, vec2 seed) {
      return vec2(
            texture2D(noise_tex, uv + vec2(seed.x, 0)).r, 
            texture2D(noise_tex, uv + vec2(0, seed.y)).g
        );
    }

    vec3 hsv2rgb(vec3 c)
    {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
`
  
  useSimulation("webgl", common + `
    vec2 get_attraction(vec2 uv)
    {
        vec2 scale = (1.0 / resolution.xy);
            
        vec2 res = vec2(0.0);
        const float samples = 1.0;
            
        for (float dist = 0.0; dist <= 1.0; dist += 1.0/DISTANCE_SAMPLES) {        
            for (float circle_pos = -PI; circle_pos <= PI; circle_pos += 1.0/CIRCLE_SAMPLES) {
                
                vec2 offset = vec2(sin(circle_pos), cos(circle_pos));
                
                //offset += gold_noise(uv, vec2(iTime + dist + circle_pos + 1.0, iTime + dist + circle_pos + 2.0)) / SIZE;
                            
                offset *= dist*SIZE;
                offset *= scale;
    
                float val = pow(texture2D(self, uv + offset).r, 2.95);
    
                res += offset * val;
            }
        }
        
        
        res /= DISTANCE_SAMPLES * CIRCLE_SAMPLES;
        res *= 0.15;
                
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
          //discard;
        }

        /*
        
        
        float rot = radians(180.0);
        
        uv -= 0.5;
        uv *= mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
        uv += 0.5;*/
                  
      
        
        gl_FragColor.r += texture2D(self, uv - get_attraction(uv) ).r;
        
        gl_FragColor.r *= 0.85;
        
        //gl_FragColor.r = sin(gl_FragColor.r); 
        
      
   
    }`,
    common + `
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
          gl_FragColor.a = v;
      }
    `
  )  
  
  return <canvas style={{width: "100%",  height: "100%"}} id="webgl"></canvas>
}

export default App;
