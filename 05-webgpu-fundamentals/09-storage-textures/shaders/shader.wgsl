struct TimeUniform {
    time: f32,
};

@group(0) @binding(0) var textureStorage: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<uniform> timeUniform: TimeUniform;

@compute @workgroup_size(1)
fn computeMain(@builtin(global_invocation_id) id: vec3<u32>) {
    let size: vec2<u32> = textureDimensions(textureStorage);
    let center: vec2<f32> = vec2<f32>(size) / 2.0;
    let pos: vec2<u32> = id.xy;
    let dist: f32 = distance(vec2<f32>(pos), center);
    let stripe: f32 = abs(sin(timeUniform.time / 2000.0) * dist / 32.0 % 2.0);
    let color1: vec4<f32> = vec4<f32>(1.0, 1.0, 1.0, 1.0);
    let color2: vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    let color: vec4<f32> = select(color1, color2, stripe < 1.0);
    textureStore(textureStorage, pos, color);
}