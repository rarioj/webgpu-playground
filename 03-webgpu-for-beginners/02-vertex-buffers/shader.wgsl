struct Fragment {
    @builtin(position) Position: vec4<f32>,
    @location(0) Color: vec4<f32>,
};

@vertex
fn vertexMain(@location(0) positions: vec2<f32>, @location(1) colors: vec3<f32>) -> Fragment {
    var output: Fragment;
    output.Position = vec4<f32>(positions, 0.0, 1.0);
    output.Color = vec4<f32>(colors, 1.0);
    return output;
}

@fragment
fn fragmentMain(@location(0) Color: vec4<f32>) -> @location(0) vec4<f32> {
    return Color;
}