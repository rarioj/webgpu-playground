const WORKGROUP_SIZE: i32 = 2 /* WORKGROUP_SIZE */;

@group(0) @binding(0) var<uniform> grid: vec2<f32>;
@group(0) @binding(1) var<storage> cellStateIn: array<u32>;
@group(0) @binding(2) var<storage, read_write> cellStateOut: array<u32>;

fn cellIndex(cell: vec2<u32>) -> u32 {
    return (cell.y % u32(grid.y)) * u32(grid.x) + (cell.x % u32(grid.x));
}

fn cellActive(x: u32, y: u32) -> u32 {
    return cellStateIn[cellIndex(vec2u(x, y))];
}

@compute @workgroup_size(WORKGROUP_SIZE, WORKGROUP_SIZE)
fn computeMain(@builtin(global_invocation_id) global: vec3<u32>) {
    let neighbours: u32 = cellActive(global.x + 1u, global.y + 1u) + cellActive(global.x + 1u, global.y) + cellActive(global.x + 1u, global.y - 1u) + cellActive(global.x, global.y - 1u) + cellActive(global.x - 1u, global.y - 1u) + cellActive(global.x - 1u, global.y) + cellActive(global.x - 1u, global.y + 1u) + cellActive(global.x, global.y + 1u);
    let index: u32 = cellIndex(vec2u(global.xy));
    switch neighbours {
        case 2u: { cellStateOut[index] = cellStateIn[index]; }
        case 3u: { cellStateOut[index] = 1u; }
        default: { cellStateOut[index] = 0u; }
    }
}
