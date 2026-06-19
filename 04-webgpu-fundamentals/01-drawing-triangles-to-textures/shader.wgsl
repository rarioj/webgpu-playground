@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4<f32> {
    var vertices: array<vec2<f32>, 3> = array<vec2<f32>, 3>(
        vec2<f32>(0.0, 0.75), // top center
        vec2<f32>(-0.75, -0.75), // bottom left
        vec2<f32>(0.75, -0.75), // bottom right
    );

    return vec4<f32>(vertices[vertexIndex], 0.0, 1.0); // x, y, z, w
}

@fragment
fn fragmentMain() -> @location(0) vec4<f32> {
    return vec4<f32>(1.0, 0.0, 0.0, 1.0); // red, green, blue, alpha
}