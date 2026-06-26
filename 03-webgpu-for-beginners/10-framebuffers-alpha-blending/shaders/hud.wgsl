struct Fragment {
    @builtin(position) Position: vec4<f32>,
    @location(0) Direction: vec2<f32>,
};

@group(0) @binding(0) var imageTexture: texture_2d<f32>;
@group(0) @binding(1) var imageSampler: sampler;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> Fragment {
    var positions: array<vec2<f32>, 6> = array<vec2<f32>, 6>(
        vec2<f32>(1.0, 1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(-1.0, 1.0),
    );

    var output: Fragment;
    output.Position = vec4<f32>(positions[vertexIndex], 0.0, 1.0);
    output.Direction = vec2<f32>(0.5, -0.5) * (positions[vertexIndex] + vec2(1.0));
    return output;
}

@fragment
fn fragmentMain(@location(0) Direction: vec2<f32>) -> @location(0) vec4<f32> {
    return textureSample(imageTexture, imageSampler, Direction);
}