struct Fragment {
    @builtin(position) Position: vec4<f32>,
    @location(0) Direction: vec2<f32>,
};

@group(0) @binding(0) var colorTexture: texture_2d<f32>;
@group(0) @binding(1) var colorSampler: sampler;

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
    output.Direction = positions[vertexIndex];
    return output;
}

@fragment
fn fragmentMain(@location(0) Direction: vec2<f32>) -> @location(0) vec4<f32> {
    var position: vec2<f32> = vec2<f32>(Direction.x, 0.75 * (Direction.y + 0.25 * sin(Direction.y) * cos(Direction.x)));
    if position.y < -1.0 || position.y > 1.0 { discard; }
    position = vec2<f32>(0.5, -0.5) * (vec2<f32>(1.0, 1.0) + position);
    return textureSample(colorTexture, colorSampler, position);
}