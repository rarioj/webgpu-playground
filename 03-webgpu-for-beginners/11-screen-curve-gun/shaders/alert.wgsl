struct TimeUniform {
    time: f32,
};

struct Fragment {
    @builtin(position) Position: vec4<f32>,
    @location(0) Direction: vec2<f32>,
};

@group(0) @binding(0) var imageTexture: texture_2d<f32>;
@group(0) @binding(1) var imageSampler: sampler;
@group(0) @binding(2) var<uniform> timeUniform: TimeUniform;

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
    var color: vec4<f32> = textureSample(imageTexture, imageSampler, Direction);
    if color.a < 0.5 { discard; }
    var intensity: f32 = (sin(timeUniform.time) * 0.15 + 0.65) * (color.r + color.g + color.b);
    var filtered: vec3<f32> = intensity * vec3<f32>(color.r, color.g, color.b);
    return vec4<f32>(filtered, 1.0);
}