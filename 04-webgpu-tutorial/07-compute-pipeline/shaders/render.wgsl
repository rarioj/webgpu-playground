@group(0) @binding(0) var<storage, read> mvpMatrix: array<mat4x4<f32>>;

struct Fragment {
    @builtin(position) Position: vec4<f32>,
    @location(0) fragmentPosition: vec4<f32>,
    @location(1) fragmentUV: vec2<f32>,
}

@vertex
fn vertexMain(
    @builtin(instance_index) index: u32,
    @location(0) position: vec4<f32>,
    @location(1) uv: vec2<f32>,
) -> Fragment {
    var output: Fragment;
    output.Position = mvpMatrix[index] * position;
    output.fragmentPosition = 0.5 * (position + vec4<f32>(1.0, 1.0, 1.0, 1.0));
    output.fragmentUV = uv;
    return output;
}

@fragment
fn fragmentMain(
    @location(0) fragmentPosition: vec4<f32>,
    @location(1) fragmentUV: vec2<f32>,
) -> @location(0) vec4<f32> {
    return fragmentPosition;
}