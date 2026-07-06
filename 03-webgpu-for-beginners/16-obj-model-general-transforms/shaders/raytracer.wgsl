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
    cameraForward: vec3<f32>,
    cameraRight: vec3<f32>,
    maxBounces: f32,
    cameraUp: vec3<f32>,
    objectCount: f32,
    modelObject: mat4x4<f32>,
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

struct ObjectStructure {
    cornerA: vec3<f32>,
    normalA: vec3<f32>,
    cornerB: vec3<f32>,
    normalB: vec3<f32>,
    cornerC: vec3<f32>,
    normalC: vec3<f32>,
    color: vec3<f32>,
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

fn hitRayTriangle(ray: Ray, triangle: ObjectStructure, tMin: f32, tMax: f32, oldState: RenderState) -> RenderState {
    var newState: RenderState;
    newState.color = triangle.color;
    newState.hit = false;

    let edgeAB: vec3<f32> = triangle.cornerB - triangle.cornerA;
    let edgeAC: vec3<f32> = triangle.cornerC - triangle.cornerA;
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
    var systemMatrix: mat3x3<f32> = mat3x3<f32>(ray.direction, triangle.cornerA - triangle.cornerB, triangle.cornerA - triangle.cornerC);
    let denominator: f32 = determinant(systemMatrix);
    if abs(denominator) < 0.000001 {
        return newState;
    }

    // Edge A origin and edge C - A
    systemMatrix = mat3x3<f32>(ray.direction, triangle.cornerA - ray.origin, triangle.cornerA - triangle.cornerC);
    let uHorizontal: f32 = determinant(systemMatrix) / denominator;
    if uHorizontal < 0.0 || uHorizontal > 1.0 {
        return newState;
    }

    // Edge B - A and edge A origin
    systemMatrix = mat3x3<f32>(ray.direction, triangle.cornerA - triangle.cornerB, triangle.cornerA - ray.origin);
    let vVertical: f32 = determinant(systemMatrix) / denominator;
    if vVertical < 0.0 || uHorizontal + vVertical > 1.0 {
        return newState;
    }

    // Edge B - A and edge A origin
    systemMatrix = mat3x3<f32>(triangle.cornerA - ray.origin, triangle.cornerA - triangle.cornerB, triangle.cornerA - triangle.cornerC);
    let tValue: f32 = determinant(systemMatrix) / denominator;

    if tValue > tMin && tValue < tMax {
        let newNormal: vec3<f32> = (1.0 - uHorizontal - vVertical) * triangle.normalA + uHorizontal * triangle.normalB + vVertical * triangle.normalC;
        newState.position = ray.origin + tValue * ray.direction;
        newState.normal = normalize((transpose(scene.modelObject) * vec4<f32>(triangleNormal, 0.0)).xyz);
        newState.t = tValue;
        newState.hit = true;
    }

    return newState;
}

fn hitAxisAlignedBoundingBox(ray: Ray, node: NodeObject) -> f32 {
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

fn rayTrace(ray: Ray) -> RenderState {
    var nearestHit: f32 = 999999f;
    var renderState: RenderState;
    renderState.hit = false;

    var node: NodeObject = tree.nodes[0];
    var stack: array<NodeObject, 16>;
    var stackIndex: u32 = 0u;

    while true {
        var primitiveCount: u32 = u32(node.primitiveCount);
        var leftChild: u32 = u32(node.leftChild);

        if primitiveCount == 0u {
            var child1: NodeObject = tree.nodes[leftChild];
            var child2: NodeObject = tree.nodes[leftChild + 1u];
            var distance1: f32 = hitAxisAlignedBoundingBox(ray, child1);
            var distance2: f32 = hitAxisAlignedBoundingBox(ray, child2);

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
                let objectInstance: ObjectStructure = objects.objects[u32(indexLookup.objectIndices[i + leftChild])];
                var newState: RenderState = hitRayTriangle(ray, objectInstance, 0.001, nearestHit, renderState);
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

    return renderState;
}

fn rayColor(ray: Ray) -> vec3<f32> {
    var color: vec3<f32> = vec3<f32>(1.0, 1.0, 1.0);
    var result: RenderState;

    var worldRay: Ray;
    worldRay.origin = ray.origin;
    worldRay.direction = ray.direction;

    var objectRay: Ray;
    objectRay.origin = (scene.modelObject * vec4<f32>(worldRay.origin, 1.0)).xyz;
    objectRay.direction = (scene.modelObject * vec4<f32>(worldRay.direction, 0.0)).xyz;

    for (var bounce: u32 = 0u; bounce < u32(scene.maxBounces); bounce++) {
        result = rayTrace(objectRay);
        if !result.hit {
            color = color * textureSampleLevel(skyTextureView, skySampler, worldRay.direction, 0.0).rgb;
            break;
        }

        color = color * result.color;
        worldRay.origin = worldRay.origin + result.t * worldRay.direction;
        worldRay.direction = normalize(reflect(worldRay.direction, result.normal));

        objectRay.origin = (scene.modelObject * vec4<f32>(worldRay.origin, 1.0)).xyz;
        objectRay.direction = (scene.modelObject * vec4<f32>(worldRay.direction, 0.0)).xyz;
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

    let horizontalCoeff: f32 = (f32(screenPosition.x) - f32(screenSize.x) / 2.0) / f32(screenSize.x);
    let verticalCoeff: f32 = (f32(screenPosition.y) - f32(screenSize.y) / 2.0) / f32(screenSize.y);

    var ray: Ray;
    ray.direction = normalize(ROTATION * (scene.cameraForward + horizontalCoeff * scene.cameraRight + verticalCoeff * scene.cameraUp));
    ray.origin = scene.cameraPosition;

    var pixelColor: vec3<f32> = rayColor(ray);
    textureStore(colorBuffer, screenPosition, vec4<f32>(pixelColor, 1.0));
}