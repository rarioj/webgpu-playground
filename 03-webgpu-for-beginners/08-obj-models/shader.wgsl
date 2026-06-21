const STATUE_INDEX: u32 = 266u;

struct TransformData {
    view: mat4x4<f32>,
    projection: mat4x4<f32>,
};

struct ObjectData {
    model: array<mat4x4<f32>>,
};

struct Fragment {
    @builtin(position) Position: vec4<f32>,
    @location(0) Texture: vec2<f32>,
    @location(1) @interpolate(flat) TextureIndex: u32,
};

// vertex group
@group(0) @binding(0) var<uniform> transform: TransformData;
@group(0) @binding(1) var<storage, read> objects: ObjectData;
// fragment group
@group(1) @binding(0) var imageTextureArray: texture_2d_array<f32>;
@group(1) @binding(1) var imageSampler: sampler;

@vertex
fn vertexMain(
    @builtin(instance_index) instanceIndex: u32,
    @location(0) positions: vec3<f32>,
    @location(1) texture: vec2<f32>,
) -> Fragment {
    var finalPos: vec3<f32> = positions;
    // scale down the statue
    if instanceIndex == STATUE_INDEX {
        finalPos *= 0.15;
    }
    var output: Fragment;
    output.Position = transform.projection * transform.view * objects.model[instanceIndex] * vec4<f32>(finalPos, 1.0);
    output.Texture = texture;
    output.TextureIndex = instanceIndex;
    return output;
}

@fragment
fn fragmentMain(
    @location(0) Texture: vec2<f32>,
    @location(1) @interpolate(flat) TextureIndex: u32
) -> @location(0) vec4<f32> {
    return textureSample(imageTextureArray, imageSampler, Texture, TextureIndex);
}