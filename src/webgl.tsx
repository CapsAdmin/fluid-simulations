import { useEffect, useState } from "react";
import * as twgl from "twgl.js";

export * as twgl from "twgl.js";

export const useWebGL = (
  id: string,
  init: (gl: WebGL2RenderingContext) => {
    render: (time: number) => any;
    resize: (width: number, height: number) => void;
    shutdown: () => void;
  }
) => {
  let [webGLContext, setWebGLContext] = useState<WebGL2RenderingContext | null>(
    null
  );

  useEffect(() => {
    let element = document.getElementById(id) as HTMLCanvasElement;

    if (!element) {
      return;
    }

    if (element.tagName.toLowerCase() !== "canvas") {
      return;
    }

    let gl = element.getContext("webgl2", { antialias: false, depth: false });

    if (!gl) {
      return;
    }

    let { render, resize, shutdown } = init(gl);

    if (render) {
      let loop: (time: number) => void;

      loop = (time: number) => {
        if (twgl.resizeCanvasToDisplaySize(element)) {
          resize(element.width, element.height);
        }

        if (!render(time)) {
          requestAnimationFrame(loop);
        } else {
          shutdown();
        }
      };
      requestAnimationFrame(loop);
    }

    twgl.addExtensionsToContext(gl);
    setWebGLContext(gl);

    return () => {
      shutdown();
    };
  }, [id]);

  return webGLContext;
};
