const SIZE: u32 = u32(128);

@group(0) @binding(0) var<storage, read> input: array<f32, 7>;
@group(0) @binding(1) var<storage, read_write> velocity: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> modelView: array<mat4x4<f32>>;
@group(0) @binding(3) var<uniform> projection: mat4x4<f32>;
@group(0) @binding(4) var<storage, read_write> mvpMatrix: array<mat4x4<f32>>;

@compute @workgroup_size(SIZE)
fn computeMain(@builtin(global_invocation_id) GlobalInvocationId: vec3<u32>) {
    var index: u32 = GlobalInvocationId.x;
    if f32(index) > input[0] {
        mvpMatrix[index] = projection * modelView[index];
        return;
    }
    var xMin: f32 = input[1];
    var xMax: f32 = input[2];
    var yMin: f32 = input[3];
    var yMax: f32 = input[4];
    var zMin: f32 = input[5];
    var zMax: f32 = input[6];
    var position: vec4<f32> = modelView[index][3];
    var speed: vec4<f32> = velocity[index];

    position.x += speed.x;
    if position.x < xMin {
        position.x = xMin;
        speed.x = -speed.x;
    } else if position.x > xMax {
        position.x = xMax;
        speed.x = -speed.x;
    }

    position.y += speed.y;
    if position.y < yMin {
        position.y = yMin;
        speed.y = -speed.y;
    } else if position.y > yMax {
        position.y = yMax;
        speed.y = -speed.y;
    }

    position.z += speed.z;
    if position.z < zMin {
        position.z = zMin;
        speed.z = -speed.z;
    } else if position.z > zMax {
        position.z = zMax;
        speed.z = -speed.z;
    }

    velocity[index] = speed;
    modelView[index][3] = position;
    mvpMatrix[index] = projection * modelView[index];
}