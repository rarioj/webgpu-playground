@group(0) @binding(0) var<storage> modelViews: array<mat4x4<f32>>;
@group(0) @binding(1) var<uniform> cameraProjection: mat4x4<f32>;
@group(0) @binding(2) var<uniform> lightProjection: mat4x4<f32>;
@group(0) @binding(3) var<storage> colors: array<vec4<f32>>;
@group(1) @binding(0) var<uniform> lightPosition: vec4<f32>;

@group(1) @binding(1) var shadowMap: texture_depth_2d;
@group(1) @binding(2) var shadowSampler: sampler_comparison;

struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) fragmentPosition: vec3<f32>,
    @location(1) fragmentUV: vec2<f32>,
    @location(2) fragmentNormal: vec3<f32>,
    @location(3) fragmentColor: vec4<f32>,
    @location(4) shadowPosition: vec3<f32>,
}

@vertex
fn vertexMain(
    @builtin(instance_index) index: u32,
    @location(0) position: vec3<f32>,
    @location(1) uv: vec2<f32>,
    @location(2) normal: vec3<f32>,
) -> VertexOutput {
    let modelView: mat4x4<f32> = modelViews[index];
    let pos: vec4<f32> = vec4<f32>(position, 1.0);
    let mvpCamera: vec4<f32> = cameraProjection * modelView * pos;
    let mvpLight: vec4<f32> = lightProjection * modelView * pos;

    var output: VertexOutput;
    output.Position = mvpCamera;
    output.fragmentPosition = (modelView * pos).xyz;
    output.fragmentUV = uv;
    output.fragmentNormal = (modelView * vec4<f32>(normal, 0.0)).xyz;
    output.fragmentColor = colors[index];
    output.shadowPosition = vec3<f32>(mvpLight.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5), mvpLight.z);
    return output;
}

@fragment
fn fragmentMain(
    @location(0) fragmentPosition: vec3<f32>,
    @location(1) fragmentUV: vec2<f32>,
    @location(2) fragmentNormal: vec3<f32>,
    @location(3) fragmentColor: vec4<f32>,
    @location(4) shadowPosition: vec3<f32>,
) -> @location(0) vec4<f32> {
    let pixelColor: vec3<f32> = fragmentColor.rgb;
    let diffuse: f32 = max(dot(normalize(lightPosition.xyz), fragmentNormal), 0.0);
    let size: f32 = f32(textureDimensions(shadowMap).x);
    var shadow: f32 = 0.0;
    var zBias: f32 = 0.005;

    for (var y: i32 = -1; y <= 1; y++) {
        for (var x: i32 = -1; x <= 1; x++) {
            let offset: vec2<f32> = vec2<f32>(f32(x) / size, f32(y) / size);
            shadow = shadow + textureSampleCompare(
                shadowMap,
                shadowSampler,
                shadowPosition.xy + offset,
                shadowPosition.z - zBias,
            );
        }
    }

    shadow = shadow / 9.0;
    let lightFactor: f32 = min(0.3 + shadow * diffuse, 1.0);
    return vec4<f32>(pixelColor * lightFactor, 1.0);
}