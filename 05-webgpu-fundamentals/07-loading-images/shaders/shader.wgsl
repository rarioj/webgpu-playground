struct OutputFragment {
    @builtin(position) position: vec4<f32>,
    @location(0) texcoord: vec2<f32>,
};

struct MatrixUniform {
    matrix: mat4x4<f32>,
};

@group(0) @binding(0) var textureView: texture_2d<f32>;
@group(0) @binding(1) var textureSampler: sampler;
@group(0) @binding(2) var<uniform> matrixUniform: MatrixUniform;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> OutputFragment {
    var pos: array<vec2<f32>, 6> = array<vec2<f32>, 6>(
        // first triangle
        vec2<f32>(0.0, 0.0),
        vec2<f32>(1.0, 0.0),
        vec2<f32>(0.0, 1.0),
        // second triangle
        vec2<f32>(0.0, 1.0),
        vec2<f32>(1.0, 0.0),
        vec2<f32>(1.0, 1.0),
    );

    var output: OutputFragment;
    output.position = matrixUniform.matrix * vec4<f32>(pos[vertexIndex], 0.0, 1.0);
    output.texcoord = pos[vertexIndex] * vec2<f32>(1.0, 50.0);
    return output;
}

@fragment
fn fragmentMain(input: OutputFragment) -> @location(0) vec4<f32> {
    return textureSample(textureView, textureSampler, input.texcoord);
}