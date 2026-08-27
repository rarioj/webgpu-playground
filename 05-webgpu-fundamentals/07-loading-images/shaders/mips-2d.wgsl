struct OutputFragment {
    @builtin(position) position: vec4<f32>,
    @location(0) texcoord: vec2<f32>,
};

@group(0) @binding(0) var textureView: texture_2d<f32>;
@group(0) @binding(1) var textureSampler: sampler;

@vertex
fn vMain(@builtin(vertex_index) vertexIndex: u32) -> OutputFragment {
    var pos: array<vec2<f32>, 6> = array<vec2<f32>, 6>(
        vec2<f32>(0.0, 0.0),
        vec2<f32>(1.0, 0.0),
        vec2<f32>(0.0, 1.0),
        vec2<f32>(0.0, 1.0),
        vec2<f32>(1.0, 0.0),
        vec2<f32>(1.0, 1.0),
    );

    var output: OutputFragment;
    output.position = vec4<f32>(pos[vertexIndex] * 2.0 - 1.0, 0.0, 1.0);
    output.texcoord = vec2<f32>(pos[vertexIndex].x, 1.0 - pos[vertexIndex].y);
    return output;
}

@fragment
fn fMain(input: OutputFragment) -> @location(0) vec4<f32> {
    return textureSample(textureView, textureSampler, input.texcoord);
}