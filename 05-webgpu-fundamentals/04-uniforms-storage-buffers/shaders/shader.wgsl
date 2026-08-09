struct OutputFragment {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
};

struct ObjectColorOffset {
    color: vec4<f32>,
    offset: vec2<f32>,
}

struct ObjectScale {
    scale: vec2<f32>,
}

@group(0) @binding(0) var<storage, read> objectColorOffsets: array<ObjectColorOffset>;
@group(0) @binding(1) var<storage, read> objectScales: array<ObjectScale>;
@group(0) @binding(2) var<storage, read> objectVertices: array<vec2<f32>>;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> OutputFragment {
    let objectColorOffset: ObjectColorOffset = objectColorOffsets[instanceIndex];
    let objectScale: ObjectScale = objectScales[instanceIndex];

    var output: OutputFragment;
    output.position = vec4<f32>(objectVertices[vertexIndex] * objectScale.scale + objectColorOffset.offset, 0.0, 1.0);
    output.color = objectColorOffset.color;
    return output;
}

@fragment
fn fragmentMain(output: OutputFragment) -> @location(0) vec4<f32> {
    return output.color;
}