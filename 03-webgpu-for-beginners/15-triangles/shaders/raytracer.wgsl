const PI: f32 = 3.14159;
const COS_THETA: f32 = cos(PI / 2f);
const SIN_THETA: f32 = sin(PI / 2f);
const ROTATION: mat3x3<f32> = mat3x3<f32>(
    vec3<f32>(1.0, 0.0, 0.0),
    vec3<f32>(0.0, COS_THETA, SIN_THETA),
    vec3<f32>(0.0, -SIN_THETA, COS_THETA)
);

struct SceneData {
    cameraPosition: vec3<f32>,
    maxBounces: f32,
    cameraForward: vec3<f32>,
    objectCount: f32,
    cameraRight: vec3<f32>,
    cameraUp: vec3<f32>,
}

struct NodeObject {
    minCorner: vec3<f32>,
    leftChild: f32,
    maxCorner: vec3<f32>,
    primitiveCount: f32,
}

struct ObjectIndices {
    objectIndices: array<u32>,
}

// Combining both Sphere and Triangle structures
struct ObjectStructure {
    vec3Attr1: vec3<f32>, // center (Sphere), corner_a (Triangle)
    floatAttr1: f32, // object type - 0 = Sphere, 1 = Triangle
    vec3Attr2: vec3<f32>, // color (Sphere), corner_b (Triangle)
    floatAttr2: f32, // radius (Sphere)
    vec3Attr3: vec3<f32>, // corner_c (Triangle)
    floatAttr3: f32,
    vec3Attr4: vec3<f32>, // color (Triangle)
    floatAttr4: f32,
}

struct ObjectData {
    objects: array<ObjectStructure>,
}

struct BVH {
    nodes: array<NodeObject>,
}

struct Ray {
    direction: vec3<f32>,
    origin: vec3<f32>,
}

struct RenderState {
    t: f32,
    color: vec3<f32>,
    hit: bool,
    position: vec3<f32>,
    normal: vec3<f32>,
}

@group(0) @binding(0) var colorBuffer: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<uniform> scene: SceneData;
@group(0) @binding(2) var<storage, read> objects: ObjectData;
@group(0) @binding(3) var<storage, read> tree: BVH;
@group(0) @binding(4) var<storage, read> indexLookup: ObjectIndices;
@group(0) @binding(5) var skyTextureView: texture_cube<f32>;
@group(0) @binding(6) var skySampler: sampler;

// https://codesignal.com/learn/courses/geometry-and-scene-building-in-our-cpp-ray-tracer/lessons/ray-sphere-intersection
fn intersectRaySphere(ray: Ray, sphere: ObjectStructure, tMin: f32, tMax: f32, oldState: RenderState) -> RenderState {
    let sphereCenter: vec3<f32> = sphere.vec3Attr1;
    let sphereColor: vec3<f32> = sphere.vec3Attr2;
    let sphereRadius: f32 = sphere.floatAttr2;

    let a: f32 = dot(ray.direction, ray.direction);
    let b: f32 = 2.0f * dot(ray.direction, ray.origin - sphereCenter);
    let c: f32 = dot(ray.origin - sphereCenter, ray.origin - sphereCenter) - sphereRadius * sphereRadius;
    let discriminant: f32 = b * b - 4.0 * a * c;

    var newState: RenderState;
    newState.color = oldState.color;

    if discriminant > 0.0 {
        let t: f32 = (-b - sqrt(discriminant)) / (2f * a);
        if t > tMin && t < tMax {
            newState.position = ray.origin + t * ray.direction;
            newState.normal = normalize(newState.position - sphereCenter);
            newState.t = t;
            newState.color = sphereColor;
            newState.hit = true;
            return newState;
        }
    }

    newState.hit = false;
    return newState;
}

fn intersectRayTriangle(ray: Ray, triangle: ObjectStructure, tMin: f32, tMax: f32, oldState: RenderState) -> RenderState {
    let triangleCornerA: vec3<f32> = triangle.vec3Attr1;
    let triangleCornerB: vec3<f32> = triangle.vec3Attr2;
    let triangleCornerC: vec3<f32> = triangle.vec3Attr3;
    let triangleColor: vec3<f32> = triangle.vec3Attr4;

    var newState: RenderState;
    newState.color = triangleColor;
    newState.hit = false;

    let edgeAB: vec3<f32> = triangleCornerB - triangleCornerA;
    let edgeAC: vec3<f32> = triangleCornerC - triangleCornerA;
    var triangleNormal: vec3<f32> = normalize(cross(edgeAB, edgeAC));
    var rayDotNormal: f32 = dot(ray.direction, triangleNormal);

    if rayDotNormal > 0.0 {
        rayDotNormal = rayDotNormal * -1.0;
        triangleNormal = triangleNormal * -1.0;
    }
    if abs(rayDotNormal) < 0.000001 {
        return newState;
    }

    // Edge B - A and edge C - A
    var systemMatrix: mat3x3<f32> = mat3x3<f32>(ray.direction, triangleCornerA - triangleCornerB, triangleCornerA - triangleCornerC);
    // Manual calculation due to wgsl-analyzer extension bug
    // let denominator: f32 = determinant(systemMatrix);
    let denominator: f32 = systemMatrix[0][0] * (systemMatrix[1][1] * systemMatrix[2][2] - systemMatrix[1][2] * systemMatrix[2][1]) -
                            systemMatrix[0][1] * (systemMatrix[1][0] * systemMatrix[2][2] - systemMatrix[1][2] * systemMatrix[2][0]) +
                            systemMatrix[0][2] * (systemMatrix[1][0] * systemMatrix[2][1] - systemMatrix[1][1] * systemMatrix[2][0]);
    if abs(denominator) < 0.000001 {
        return newState;
    }

    // Edge A origin and edge C - A
    systemMatrix = mat3x3<f32>(ray.direction, triangleCornerA - ray.origin, triangleCornerA - triangleCornerC);
    // Manual calculation due to wgsl-analyzer extension bug
    // let uHorizontal: f32 = determinant(systemMatrix) / denominator;
    let uHorizontal: f32 = (systemMatrix[0][0] * (systemMatrix[1][1] * systemMatrix[2][2] - systemMatrix[1][2] * systemMatrix[2][1]) -
                            systemMatrix[0][1] * (systemMatrix[1][0] * systemMatrix[2][2] - systemMatrix[1][2] * systemMatrix[2][0]) +
                            systemMatrix[0][2] * (systemMatrix[1][0] * systemMatrix[2][1] - systemMatrix[1][1] * systemMatrix[2][0])) / denominator;
    if uHorizontal < 0.0 || uHorizontal > 1.0 {
        return newState;
    }

    // Edge B - A and edge A origin
    systemMatrix = mat3x3<f32>(ray.direction, triangleCornerA - triangleCornerB, triangleCornerA - ray.origin);
    // Manual calculation due to wgsl-analyzer extension bug
    // let vVertical: f32 = determinant(systemMatrix) / denominator;
    let vVertical: f32 = (systemMatrix[0][0] * (systemMatrix[1][1] * systemMatrix[2][2] - systemMatrix[1][2] * systemMatrix[2][1]) -
                            systemMatrix[0][1] * (systemMatrix[1][0] * systemMatrix[2][2] - systemMatrix[1][2] * systemMatrix[2][0]) +
                            systemMatrix[0][2] * (systemMatrix[1][0] * systemMatrix[2][1] - systemMatrix[1][1] * systemMatrix[2][0])) / denominator;
    if vVertical < 0.0 || uHorizontal + vVertical > 1.0 {
        return newState;
    }

    // Edge B - A and edge A origin
    systemMatrix = mat3x3<f32>(triangleCornerA - ray.origin, triangleCornerA - triangleCornerB, triangleCornerA - triangleCornerC);
    // Manual calculation due to wgsl-analyzer extension bug
    // let tValue: f32 = determinant(systemMatrix) / denominator;
    let tValue: f32 = (systemMatrix[0][0] * (systemMatrix[1][1] * systemMatrix[2][2] - systemMatrix[1][2] * systemMatrix[2][1]) -
                        systemMatrix[0][1] * (systemMatrix[1][0] * systemMatrix[2][2] - systemMatrix[1][2] * systemMatrix[2][0]) +
                        systemMatrix[0][2] * (systemMatrix[1][0] * systemMatrix[2][1] - systemMatrix[1][1] * systemMatrix[2][0])) / denominator;

    if tValue > tMin && tValue < tMax {
        newState.position = ray.origin + tValue * ray.direction;
        newState.normal = triangleNormal;
        newState.t = tValue;
        newState.hit = true;
    }

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

fn trace(ray: Ray) -> RenderState {
    var nearestHit: f32 = 999999f;
    var renderState: RenderState;
    renderState.hit = false;

    var node: NodeObject = tree.nodes[0];
    var stack: array<NodeObject, 15>;
    var stackIndex: u32 = 0u;

    while true {
        var primitiveCount: u32 = u32(node.primitiveCount);
        var leftChild: u32 = u32(node.leftChild);

        if primitiveCount == 0u {
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
            for (var i: u32 = 0u; i < primitiveCount; i++) {
                var newState: RenderState;
                let objectInstance: ObjectStructure = objects.objects[indexLookup.objectIndices[i + leftChild]];
                if u32(objectInstance.floatAttr1) == 0u {
                    newState = intersectRaySphere(ray, objectInstance, 0.001, nearestHit, renderState);
                } else {
                    newState = intersectRayTriangle(ray, objectInstance, 0.001, nearestHit, renderState);
                }
                if newState.hit {
                    nearestHit = newState.t;
                    renderState = newState;
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

    if !renderState.hit {
        renderState.color = textureSampleLevel(skyTextureView, skySampler, ROTATION * ray.direction, 0.0).rgb;
    }

    return renderState;
}

fn fetchRayColor(ray: Ray) -> vec3<f32> {
    var color: vec3<f32> = vec3<f32>(1.0, 1.0, 1.0);
    var result: RenderState;

    var tempRay: Ray;
    tempRay.origin = ray.origin;
    tempRay.direction = ray.direction;

    let maxBounces: u32 = u32(scene.maxBounces);
    for (var bounce: u32 = 0u; bounce < maxBounces; bounce++) {
        result = trace(tempRay);
        color = color * result.color;
        if !result.hit {
            break;
        }
        tempRay.origin = result.position;
        tempRay.direction = normalize(reflect(tempRay.direction, result.normal));
    }

    if result.hit {
        color = vec3(0.0, 0.0, 0.0);
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

    var pixelColor: vec3<f32> = fetchRayColor(ray);
    textureStore(colorBuffer, screenPosition, vec4<f32>(pixelColor, 1.0));
}