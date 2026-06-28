struct TransformData {
    view: mat4x4<f32>,
    projection: mat4x4<f32>,
};

struct Fragment {
    @builtin(position) Position: vec4<f32>,
    @location(0) Direction: vec2<f32>,
};

@group(0) @binding(0) var<uniform> transform: TransformData;
@group(1) @binding(0) var colorTexture: texture_2d<f32>;
@group(1) @binding(1) var colorSampler: sampler;

@vertex
fn vertexMain(
    @location(0) vertexPosition: vec3<f32>,
    @location(1) vertexTexture: vec2<f32>,
    @location(2) vertexNormal: vec3<f32>
) -> Fragment {
    var output: Fragment;
    output.Position = transform.projection * vec4<f32>(vertexPosition, 1.0);
    output.Direction = vertexTexture;
    return output;
}

@fragment
fn fragmentMain(@location(0) Direction: vec2<f32>) -> @location(0) vec4<f32> {
    return textureSample(colorTexture, colorSampler, Direction);
}