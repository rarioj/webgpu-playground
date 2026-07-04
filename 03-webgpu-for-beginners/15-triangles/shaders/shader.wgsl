struct Fragment {
    @builtin(position) Position: vec4<f32>,
    @location(0) Texture: vec2<f32>,
};

@group(0) @binding(0) var colorBuffer: texture_2d<f32>;
@group(0) @binding(1) var screenSampler: sampler;

@vertex
fn vertexMain(@builtin(vertex_index) VertexIndex: u32) -> Fragment {
    var positions: array<vec2<f32>, 6> = array<vec2<f32>, 6>(
        vec2<f32>(1.0, 1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(-1.0, 1.0),
    );

    var textures: array<vec2<f32>, 6> = array<vec2<f32>, 6>(
        vec2<f32>(1.0, 0.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(0.0, 1.0),
        vec2<f32>(1.0, 0.0),
        vec2<f32>(0.0, 1.0),
        vec2<f32>(0.0, 0.0),
    );

    var output: Fragment;
    output.Position = vec4<f32>(positions[VertexIndex], 0.0, 1.0);
    output.Texture = textures[VertexIndex];
    return output;
}

@fragment
fn fragmentMain(@location(0) Texture: vec2<f32>) -> @location(0) vec4<f32> {
    return textureSample(colorBuffer, screenSampler, Texture);
}