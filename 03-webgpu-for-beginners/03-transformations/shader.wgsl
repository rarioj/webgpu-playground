struct TransformData {
    model: mat4x4<f32>,
    view: mat4x4<f32>,
    projection: mat4x4<f32>,
};

struct Fragment {
    @builtin(position) Position: vec4<f32>,
    @location(0) Color: vec4<f32>,
};

@binding(0) @group(0) var<uniform> transform: TransformData;

@vertex
fn vertexMain(@location(0) positions: vec3<f32>, @location(1) colors: vec3<f32>) -> Fragment {
    var output: Fragment;
    output.Position = transform.projection * transform.view * transform.model * vec4<f32>(positions, 1.0);
    output.Color = vec4<f32>(colors, 1.0);
    return output;
}

@fragment
fn fragmentMain(@location(0) Color: vec4<f32>) -> @location(0) vec4<f32> {
    return Color;
}