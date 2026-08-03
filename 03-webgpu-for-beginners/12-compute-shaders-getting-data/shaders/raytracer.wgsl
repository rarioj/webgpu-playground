struct Sphere {
    center: vec3<f32>,
    color: vec3<f32>,
    radius: f32,
}

struct ObjectData {
    spheres: array<Sphere>,
}

struct Ray {
    direction: vec3<f32>,
    origin: vec3<f32>,
}

struct SceneData {
    cameraPosition: vec3<f32>,
    cameraForward: vec3<f32>,
    cameraRight: vec3<f32>,
    cameraUp: vec3<f32>,
    sphereCount: f32,
}

struct RenderState {
    t: f32,
    color: vec3<f32>,
    hit: bool,
}

@group(0) @binding(0) var colorBuffer: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<uniform> scene: SceneData;
@group(0) @binding(2) var<storage, read> objects: ObjectData;

// https://codesignal.com/learn/courses/geometry-and-scene-building-in-our-cpp-ray-tracer/lessons/ray-sphere-intersection
fn intersectRaySphere(ray: Ray, sphere: Sphere, tMin: f32, tMax: f32, oldState: RenderState) -> RenderState {
    let a: f32 = dot(ray.direction, ray.direction);
    let b: f32 = 2.0f * dot(ray.direction, ray.origin - sphere.center);
    let c: f32 = dot(ray.origin - sphere.center, ray.origin - sphere.center) - sphere.radius * sphere.radius;
    let discriminant: f32 = b * b - 4.0 * a * c;

    var newState: RenderState;
    newState.color = oldState.color;

    if discriminant > 0.0 {
        let t: f32 = (-b - sqrt(discriminant)) / (2f * a);
        if t > tMin && t < tMax {
            newState.t = t;
            newState.color = sphere.color;
            newState.hit = true;
            return newState;
        }
    }

    newState.hit = false;
    return newState;
}

fn rayColor(ray: Ray) -> vec3<f32> {
    var color: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
    var nearestHit: f32 = 9999f;
    var somethingHit: bool = false;
    var renderState: RenderState;

    for (var i: u32 = 0u; i < u32(scene.sphereCount); i++) {
        var newState: RenderState = intersectRaySphere(ray, objects.spheres[i], 0.001, nearestHit, renderState);
        if newState.hit {
            nearestHit = newState.t;
            renderState = newState;
            somethingHit = true;
        }
    }

    if somethingHit {
        color = renderState.color;
    }

    return color;
}

@compute @workgroup_size(16, 16, 1)
fn computeMain(@builtin(global_invocation_id) GlobalInvocationId: vec3<u32>) {
    let screenSize: vec2<i32> = vec2<i32>(textureDimensions(colorBuffer));
    let screenPosition: vec2<i32> = vec2<i32>(i32(GlobalInvocationId.x), i32(GlobalInvocationId.y));

    if screenPosition.x >= screenSize.x || screenPosition.y >= screenSize.y { return; }

    let horizontalCoeff: f32 = (f32(screenPosition.x) - f32(screenSize.x) / 2.0) / f32(screenSize.x);
    let verticalCoeff: f32 = (f32(screenPosition.y) - f32(screenSize.y) / 2.0) / f32(screenSize.y);

    let forward: vec3<f32> = scene.cameraForward;
    let right: vec3<f32> = scene.cameraRight;
    let up: vec3<f32> = scene.cameraUp;

    var myRay: Ray;
    myRay.direction = normalize(forward + horizontalCoeff * right + verticalCoeff * up);
    myRay.origin = scene.cameraPosition;

    var pixelColor: vec3<f32> = rayColor(myRay);

    textureStore(colorBuffer, screenPosition, vec4<f32>(pixelColor, 1.0));
}