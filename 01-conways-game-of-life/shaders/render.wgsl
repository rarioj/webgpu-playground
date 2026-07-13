struct VertexInput {
    @location(0) position: vec2<f32>,
    @builtin(instance_index) instance: u32,
}
struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) cell: vec2<f32>,
}

@group(0) @binding(0) var<uniform> grid: vec2<f32>;
@group(0) @binding(1) var<storage> cellState: array<u32>;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var i: f32 = f32(input.instance);
    var cell: vec2<f32> = vec2<f32>(i % grid.x, floor(i / grid.x));
    var state: f32 = f32(cellState[input.instance]);
    var cellOffset: vec2<f32> = cell / grid * 2.0;
    var gridPos: vec2<f32> = (input.position * state + 1.0) / grid - 1.0 + cellOffset;

    var output: VertexOutput;
    output.position = vec4<f32>(gridPos, 0.0, 1.0);
    output.cell = cell / grid;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    return vec4<f32>(input.cell, 1.0 - input.cell.x, 1.0);
}
