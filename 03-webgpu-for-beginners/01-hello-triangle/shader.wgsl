struct Fragment {
    @builtin(position) Position: vec4<f32>,
    @location(0) Color: vec4<f32>,
};

@vertex
fn vertexMain(@builtin(vertex_index) v_index: u32) -> Fragment {
// pre-baked positions and colors
    var positions: array<vec2<f32>, 3> = array<vec2<f32>, 3>(
        vec2<f32>(0.0, 0.5), // top corner
        vec2<f32>(-0.5, -0.5), // bottom left corner
        vec2<f32>(0.5, -0.5), // bottom right corner
    );
    var colors: array<vec3<f32>, 3> = array<vec3<f32>, 3>(
        vec3<f32>(1.0, 0.0, 0.0), // red top corner
        vec3<f32>(0.0, 1.0, 0.0), // green bottom left corner
        vec3<f32>(0.0, 0.0, 1.0), // blue bottom right corner
    );

    var output: Fragment;
    output.Position = vec4<f32>(positions[v_index], 0.0, 1.0);
    output.Color = vec4<f32>(colors[v_index], 1.0);
    return output;
}

@fragment
fn fragmentMain(@location(0) Color: vec4<f32>) -> @location(0) vec4<f32> {
    return Color;
}