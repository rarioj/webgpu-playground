struct Sphere {
    center: vec3<f32>,
    color: vec3<f32>,
    radius: f32,
}

struct ObjectData {
    spheres: array<Sphere>,
}

struct NodeObject {
    minCorner: vec3<f32>,
    leftChild: f32,
    maxCorner: vec3<f32>,
    sphereCount: f32,
}

struct BVH {
    nodes: array<NodeObject>,
}

struct ObjectIndices {
    sphereIndices: array<f32>,
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
@group(0) @binding(3) var<storage, read> tree: BVH;
@group(0) @binding(4) var<storage, read> sphereLookup: ObjectIndices;

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

fn intersectAABB(ray: Ray, node: NodeObject) -> f32 {
    var t1: vec3<f32> = (node.minCorner - ray.origin) * (vec3(1.0) / ray.direction);
    var t2: vec3<f32> = (node.maxCorner - ray.origin) * (vec3(1.0) / ray.direction);
    var tMin: vec3<f32> = min(t1, t2);
    var tMax: vec3<f32> = max(t1, t2);
    var t_min: f32 = max(max(tMin.x, tMin.y), tMin.z);
    var t_max: f32 = min(min(tMax.x, tMax.y), tMax.z);

    if t_min > t_max || t_max < 0f {
        return 999999f;
    }
    return t_min;
}

fn rayColor(ray: Ray) -> vec3<f32> {
    var color: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
    var nearestHit: f32 = 999999f;
    var somethingHit: bool = false;
    var renderState: RenderState;
    var node: NodeObject = tree.nodes[0];
    var stack: array<NodeObject, 15>;
    var stackIndex: u32 = 0u;

    while true {
        var sphereCount: u32 = u32(node.sphereCount);
        var leftChild: u32 = u32(node.leftChild);

        if sphereCount == 0u {
            var child1: NodeObject = tree.nodes[leftChild];
            var child2: NodeObject = tree.nodes[leftChild + 1u];
            var distance1: f32 = intersectAABB(ray, child1);
            var distance2: f32 = intersectAABB(ray, child2);

            if distance1 > distance2 {
                var tempDistance: f32 = distance1;
                distance1 = distance2;
                distance2 = tempDistance;

                var tempChild: NodeObject = child1;
                child1 = child2;
                child2 = tempChild;
            }

            if distance1 > nearestHit {
                if stackIndex == 0u {
break;
                } else {
                    stackIndex--;
                    node = stack[stackIndex];
                }
            } else {
                node = child1;
                if distance2 < nearestHit {
                    stack[stackIndex] = child2;
                    stackIndex++;
                }
            }
        } else {
            for (var i: u32 = 0u; i < sphereCount; i++) {
                var newState: RenderState = intersectRaySphere(ray, objects.spheres[u32(sphereLookup.sphereIndices[i + leftChild])], 0.001, nearestHit, renderState);
                if newState.hit {
                    nearestHit = newState.t;
                    renderState = newState;
                    somethingHit = true;
                }
            }

            if stackIndex == 0u {
break;
            } else {
                stackIndex--;
                node = stack[stackIndex];
            }
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

    var ray: Ray;
    ray.direction = normalize(scene.cameraForward + horizontalCoeff * scene.cameraRight + verticalCoeff * scene.cameraUp);
    ray.origin = scene.cameraPosition;

    var pixelColor: vec3<f32> = rayColor(ray);
    textureStore(colorBuffer, screenPosition, vec4<f32>(pixelColor, 1.0));
}