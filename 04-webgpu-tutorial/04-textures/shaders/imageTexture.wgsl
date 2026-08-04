@group(0) @binding(0) var<storage, read> mvpMatrix: array<mat4x4<f32>>;
@group(1) @binding(0) var TextureView: texture_2d<f32>;
@group(1) @binding(1) var Sampler: sampler;

struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) fragmentUV: vec2<f32>,
    @location(1) fragmentPosition: vec4<f32>,
}

@vertex
fn vertexMain(@builtin(instance_index) index: u32, @location(0) position: vec4<f32>, @location(1) uv: vec2<f32>) -> VertexOutput {
    var output: VertexOutput;
    output.Position = mvpMatrix[index] * position;
    output.fragmentUV = uv;
    output.fragmentPosition = 0.5 * (position + vec4<f32>(1.0, 1.0, 1.0, 1.0));
    return output;
}

@fragment
fn fragmentMain(@location(0) fragmentUV: vec2<f32>, @location(1) fragmentPosition: vec4<f32>) -> @location(0) vec4<f32> {
// return textureSample(TextureView, Sampler, fragmentUV) * fragmentPosition;
    return textureSample(TextureView, Sampler, fragmentUV);
}