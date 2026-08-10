struct OutputFragment {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
};

struct ObjectData {
    @location(0) position: vec2<f32>,
    @location(1) gradient: vec3<f32>,
    @location(2) color: vec4<f32>,
    @location(3) offset: vec2<f32>,
    @location(4) scale: vec2<f32>,
};

@vertex
fn vertexMain(vertex: ObjectData) -> OutputFragment {
    var output: OutputFragment;
    output.position = vec4<f32>(vertex.position * vertex.scale + vertex.offset, 0.0, 1.0);
    output.color = vertex.color * vec4<f32>(vertex.gradient, 1.0);
    return output;
}

@fragment
fn fragmentMain(output: OutputFragment) -> @location(0) vec4<f32> {
    return output.color;
}