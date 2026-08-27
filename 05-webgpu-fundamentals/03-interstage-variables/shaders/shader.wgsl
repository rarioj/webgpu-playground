struct OutputFragment {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
};

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> OutputFragment {
    var pos: array<vec2<f32>, 3> = array<vec2<f32>, 3>(
        vec2<f32>(0.0, 0.5), // top center vertex
        vec2<f32>(-0.5, -0.5), // bottom left vertex
        vec2<f32>(0.5, -0.5), // bottom right vertex
    );
    var color: array<vec4<f32>, 3> = array<vec4<f32>, 3>(
        vec4<f32>(1.0, 0.0, 0.0, 1.0), // red
        vec4<f32>(0.0, 1.0, 0.0, 1.0), // green
        vec4<f32>(0.0, 0.0, 1.0, 1.0), // blue
    );

    var output: OutputFragment;
    output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
    output.color = color[vertexIndex];
    return output;
}

@fragment
fn fragmentGradient(input: OutputFragment) -> @location(0) vec4<f32> {
    return input.color;
}

@fragment
fn fragmentChecker(input: OutputFragment) -> @location(0) vec4<f32> {
    let col1: vec4<f32> = vec4<f32>(1.0, 1.0, 1.0, 1.0);
    let col2: vec4<f32> = vec4<f32>(0.5, 0.5, 0.5, 1.0);
    let grid: vec2<u32> = vec2<u32>(input.position.xy) / u32(32);
    let checker: bool = (grid.x + grid.y) % 2u == 1u;

    return select(col1, col2, checker);
}