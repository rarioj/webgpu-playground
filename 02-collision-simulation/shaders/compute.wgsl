const PI: f32 = 3.14159;
const TIME_STEP: f32 = 0.016;

struct Ball {
    radius: f32,
    position: vec2<f32>,
    velocity: vec2<f32>,
}

struct Scene {
    width: f32,
    height: f32,
}

@group(0) @binding(0) var<storage, read> input: array<Ball>;
@group(0) @binding(1) var<storage, read_write> output: array<Ball>;
@group(0) @binding(2) var<storage, read> scene: Scene;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global: vec3<u32>) {
    let num_balls: u32 = arrayLength(&output);
    if global.x < num_balls {
        var src_ball: Ball = input[global.x];
        let dest_ball /*: ptr<storage, Ball, read_write> */ = &output[global.x];
        (*dest_ball) = src_ball;

        // ball & ball collisions
        for (var i: u32 = 0u; i < num_balls; i++) {
            if i == global.x {
                continue;
            }
            var other_ball: Ball = input[i];
            let new_position: vec2<f32> = src_ball.position - other_ball.position;
            let distance: f32 = length(new_position);
            if distance >= src_ball.radius + other_ball.radius {
                continue;
            }
            let overlap: f32 = src_ball.radius + other_ball.radius - distance;
            (*dest_ball).position = src_ball.position + normalize(new_position) * overlap / 2.;

            // https://physics.stackexchange.com/questions/599278/how-can-i-calculate-the-final-velocities-of-two-spheres-after-an-elastic-collisi
            let src_mass: f32 = pow(src_ball.radius, 2.0) * PI;
            let other_mass: f32 = pow(other_ball.radius, 2.0) * PI;
            let collision: f32 = 2. * dot(new_position, (other_ball.velocity - src_ball.velocity)) / (dot(new_position, new_position) * (1. / src_mass + 1. / other_mass));
            (*dest_ball).velocity = src_ball.velocity + collision / src_mass * new_position;
        }

        // velocity
        (*dest_ball).position = (*dest_ball).position + (*dest_ball).velocity * TIME_STEP;

        // ball & wall collisions
        if (*dest_ball).position.x - (*dest_ball).radius < 0. {
            (*dest_ball).position.x = (*dest_ball).radius;
            (*dest_ball).velocity.x = -(*dest_ball).velocity.x;
        }
        if (*dest_ball).position.y - (*dest_ball).radius < 0. {
            (*dest_ball).position.y = (*dest_ball).radius;
            (*dest_ball).velocity.y = -(*dest_ball).velocity.y;
        }
        if (*dest_ball).position.x + (*dest_ball).radius >= scene.width {
            (*dest_ball).position.x = scene.width - (*dest_ball).radius;
            (*dest_ball).velocity.x = -(*dest_ball).velocity.x;
        }
        if (*dest_ball).position.y + (*dest_ball).radius >= scene.height {
            (*dest_ball).position.y = scene.height - (*dest_ball).radius;
            (*dest_ball).velocity.y = -(*dest_ball).velocity.y;
        }
    }
}
