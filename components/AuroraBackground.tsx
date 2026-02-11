import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

const VERT = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ), 
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  
  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);
  
  vec3 rampColor = colors[0].color;
  for (int i = 0; i < 2; i++) {
     float factor = uv.x;
     if (factor >= colors[i].position && factor <= colors[i+1].position) {
         float range = colors[i+1].position - colors[i].position;
         float lerpFactor = (factor - colors[i].position) / range;
         rampColor = mix(colors[i].color, colors[i+1].color, lerpFactor);
     }
  }
  
  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;
  
  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);
  
  vec3 auroraColor = intensity * rampColor;
  
  gl_FragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`;

interface AuroraProps {
    colorStops?: string[];
    amplitude?: number;
    blend?: number;
    speed?: number;
}

const hexToRgb = (hex: string) => {
    hex = hex.replace(/^#/, '');
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r / 255, g / 255, b / 255];
};

export default function AuroraBackground(props: AuroraProps) {
    const { colorStops = ['#5227FF', '#7cff67', '#5227FF'], amplitude = 1.0, blend = 0.5, speed = 1.0 } = props;
    const propsRef = useRef(props);
    propsRef.current = props;

    const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
        const vert = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vert, VERT);
        gl.compileShader(vert);

        const frag = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(frag, FRAG);
        gl.compileShader(frag);

        const program = gl.createProgram()!;
        gl.attachShader(program, vert);
        gl.attachShader(program, frag);
        gl.linkProgram(program);
        gl.useProgram(program);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        const verts = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

        const positionAttrib = gl.getAttribLocation(program, "position");
        gl.enableVertexAttribArray(positionAttrib);
        gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);

        const uTime = gl.getUniformLocation(program, "uTime");
        const uAmplitude = gl.getUniformLocation(program, "uAmplitude");
        const uColorStops = gl.getUniformLocation(program, "uColorStops");
        const uResolution = gl.getUniformLocation(program, "uResolution");
        const uBlend = gl.getUniformLocation(program, "uBlend");

        let startTime = Date.now();
        let frameId: number;

        const render = () => {
            const time = (Date.now() - startTime) * 0.001;
            gl.uniform1f(uTime, time * (propsRef.current.speed || 1.0));
            gl.uniform1f(uAmplitude, propsRef.current.amplitude ?? 1.0);
            gl.uniform1f(uBlend, propsRef.current.blend ?? 0.5);

            const stops = propsRef.current.colorStops ?? colorStops;
            const flattenedColors = stops.flatMap(hex => hexToRgb(hex));
            gl.uniform3fv(uColorStops, new Float32Array(flattenedColors));

            gl.uniform2f(uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);

            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
            gl.flush();
            gl.endFrameEXP();

            frameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(frameId);
        };
    };

    return (
        <View style={{ flex: 1 }}>
            <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />
        </View>
    );
}
