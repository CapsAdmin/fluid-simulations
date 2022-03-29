import { useWebGL, twgl } from "./webgl";
import door_image from "./assets/projection.png";
const common = `
    const float PHI = 1.61803398874989484820459;
    const float PI = radians(180.0);
    const float PI2 = PI/2.0;
    const float SIZE = 32.0;

    const float DISTANCE_SAMPLES = 16.0;
    const float CIRCLE_SAMPLES = 16.0;

    float random_float(vec2 xy, float seed) {
      return fract(tan(distance(xy*PHI, xy)*(seed + 1.0))*xy.x) * 2.0 - 1.0;
    }

    float random_float_tex(vec2 xy, float seed) {
      return texture2D(noise_tex, xy + vec2(seed, 0)).r;
    }

    vec2 random_vec2(vec2 xy, vec2 seed) {
      return vec2(
        random_float(xy, seed.x),
        random_float(xy, seed.y)
      );
    }

    vec2 random_vec2_tex(vec2 uv, vec2 seed) {
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
`;

const vertex_program = `
attribute vec4 position;
void main() {
  gl_Position = position;
}
`;
const program_header =
  `
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform sampler2D noise_tex;
` + common;

const positionFromMouseEvent = (event: {
  clientX: number;
  clientY: number;
  target: any;
}) => {
  let target = event.target as HTMLCanvasElement;

  if (!target) {
    return [0, 0];
  }
  let rect = target.getBoundingClientRect();

  let x = event.clientX - rect.left;
  let y = event.clientY - rect.top;

  x = (x * target.width) / target.clientWidth;
  y = (y * target.height) / target.clientHeight;

  return [x, y];
};

export const useSimulation = (
  id: string,
  simulation: string,
  shade: string
) => {
  return useWebGL(id, (gl) => {
    let rectangle = twgl.createBufferInfoFromArrays(gl, {
      position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
    });

    let buffers: twgl.FramebufferInfo[] = [];

    const simulationProgram = twgl.createProgramInfo(
      gl,
      [
        vertex_program,
        program_header +
          `
          uniform sampler2D self;
          uniform sampler2D door_tex;
          uniform int frame;
          uniform vec3 mouse;
  
        ` +
          simulation,
      ],
      (err) => {
        console.log(err);
      }
    );

    const shadeProgram = twgl.createProgramInfo(gl, [
      vertex_program,
      program_header +
        `
          uniform sampler2D self;
          uniform sampler2D door_tex;
  
        ` +
        shade,
    ]);

    const noise_tex = twgl.createTexture(gl, {
      type: gl.FLOAT,
      height: 1024,
      width: 1024,
      wrap: gl.REPEAT,
      format: gl.RED,
      internalFormat: gl.R32F,
      minMag: gl.LINEAR,

      src: (() => {
        let arr = [];
        for (let i = 0; i < 2048 * 2048; i++) {
          arr[i] = Math.random() * 2 - 1;
        }
        return arr;
      })(),
    });

    const door_tex = twgl.createTexture(gl, {
      src: door_image,
    });

    const mouse_pos = { x: 0, y: 0, z: 0 };

    const mouse_event = (evt: MouseEvent) => {
      let [x, y] = positionFromMouseEvent(evt);
      mouse_pos.x = x;
      mouse_pos.y = y;
      mouse_pos.z = evt.buttons;
    };

    const touch_event = (evt: TouchEvent) => {
      let [x, y] = positionFromMouseEvent(evt.touches.item(0)!);
      mouse_pos.x = x;
      mouse_pos.y = y;
      mouse_pos.z = 1;
    };

    const stop_event = () => {
      mouse_pos.z = 0;
    };

    gl.canvas.addEventListener(
      "mousemove",
      mouse_event as (evt: Event) => void,
      false
    );
    gl.canvas.addEventListener(
      "mousedown",
      mouse_event as (evt: Event) => void,
      false
    );

    gl.canvas.addEventListener(
      "touchmove",
      touch_event as (evt: Event) => void,
      false
    );
    gl.canvas.addEventListener(
      "ontouchstart",
      touch_event as (evt: Event) => void,
      false
    );

    gl.canvas.addEventListener("mouseup", stop_event, false);
    gl.canvas.addEventListener("touchend", stop_event, false);
    gl.canvas.addEventListener("touchcancel", stop_event, false);

    let frame = 0;

    return {
      render: (time) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, buffers[0].framebuffer);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        const uniforms = {
          resolution: [gl.canvas.width, gl.canvas.height],
          self: buffers[1].attachments[0],
          frame: frame,
          mouse: [mouse_pos.x, -mouse_pos.y + gl.canvas.height, mouse_pos.z],
          time: time / 1000,
          noise_tex: noise_tex,
          door_tex: door_tex,
        };

        gl.useProgram(simulationProgram.program);
        twgl.setBuffersAndAttributes(gl, simulationProgram, rectangle);
        twgl.setUniforms(simulationProgram, uniforms);
        twgl.drawBufferInfo(gl, rectangle);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        [buffers[0], buffers[1]] = [buffers[1], buffers[0]];

        frame = frame + 1;

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.useProgram(shadeProgram.program);
        twgl.setBuffersAndAttributes(gl, shadeProgram, rectangle);
        twgl.setUniforms(shadeProgram, {
          self: buffers[1].attachments[0],
          resolution: [gl.canvas.width, gl.canvas.height],
          time: time,
          noise_tex: noise_tex,
          door_tex: door_tex,
        });
        twgl.drawBufferInfo(gl, rectangle);
      },
      resize: (width, height) => {
        buffers = [];
        for (let i = 0; i < 2; i++) {
          buffers[i] = twgl.createFramebufferInfo(
            gl,
            [
              {
                format: gl.RGBA,
                internalFormat: gl.RGBA32F,
                type: gl.FLOAT,
                minMag: gl.LINEAR,
                wrap: gl.REPEAT,
              },
            ],
            gl.canvas.width,
            gl.canvas.height
          );
        }
      },
      shutdown: () => {
        console.log("shutdown!");
      },
    };
  });
};
