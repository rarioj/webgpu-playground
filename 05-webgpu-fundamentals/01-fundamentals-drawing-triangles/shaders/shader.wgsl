@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4<f32> {
    var pos: array<vec2<f32>, 3> = array<vec2<f32>, 3>(
        vec2<f32>(0.0, 0.5), // top center vertex
        vec2<f32>(-0.5, -0.5), // bottom left vertex
        vec2<f32>(0.5, -0.5), // bottom right vertex
    );

    return vec4<f32>(pos[vertexIndex], 0.0, 1.0);
}

@fragment
fn fragmentMain() -> @location(0) vec4<f32> {
    return vec4<f32>(1.0, 0.0, 0.0, 1.0);
}