struct TransformData {
    model: mat4x4<f32>,
    view: mat4x4<f32>,
    projection: mat4x4<f32>,
};

struct Fragment {
    @builtin(position) Position: vec4<f32>,
    @location(0) Texture: vec2<f32>,
};

@binding(0) @group(0) var<uniform> transform: TransformData;
@binding(1) @group(0) var imageTexture: texture_2d<f32>;
@binding(2) @group(0) var imageSampler: sampler;

@vertex
fn vertexMain(@location(0) positions: vec3<f32>, @location(1) textures: vec2<f32>) -> Fragment {
    var output: Fragment;
    output.Position = transform.projection * transform.view * transform.model * vec4<f32>(positions, 1.0);
    output.Texture = textures;
    return output;
}

@fragment
fn fragmentMain(@location(0) Texture: vec2<f32>) -> @location(0) vec4<f32> {
    return textureSample(imageTexture, imageSampler, Texture);
}