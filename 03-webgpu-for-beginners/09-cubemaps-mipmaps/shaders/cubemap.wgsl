const PI: f32 = 3.14159;
const COS_THETA: f32 = cos(-PI / 2f);
const SIN_THETA: f32 = sin(-PI / 2f);
const ROTATION: mat3x3<f32> = mat3x3<f32>(
    vec3<f32>(1.0, 0.0, 0.0),
    vec3<f32>(0.0, COS_THETA, SIN_THETA),
    vec3<f32>(0.0, -SIN_THETA, COS_THETA)
);

struct Camera {
    forward: vec3<f32>,
    right: vec3<f32>,
    up: vec3<f32>,
}

struct Fragment {
    @builtin(position) Position: vec4<f32>,
    @location(0) Direction: vec3<f32>,
};

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var imageTextureArray: texture_cube<f32>;
@group(0) @binding(2) var imageSampler: sampler;

@vertex
fn skyVertexMain(
    @builtin(vertex_index) vertexIndex: u32,
) -> Fragment {
    var positions: array<vec2<f32>, 6> = array<vec2<f32>, 6>(
        vec2<f32>(1.0, 1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(-1.0, 1.0),
    );

    var x: f32 = positions[vertexIndex].x;
    var y: f32 = positions[vertexIndex].y;

    var output: Fragment;
    output.Position = vec4<f32>(positions[vertexIndex], 1.0, 1.0);
    output.Direction = normalize(camera.forward + x * camera.right + y * camera.up);
    return output;
}

@fragment
fn skyFragmentMain(@location(0) Direction: vec3<f32>) -> @location(0) vec4<f32> {
    let rotatedDirection: vec3<f32> = normalize(ROTATION * Direction);
    return textureSample(imageTextureArray, imageSampler, rotatedDirection);
}