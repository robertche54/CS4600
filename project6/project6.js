var raytraceFS = `
struct Ray {
	vec3 pos;
	vec3 dir;
};

struct Material {
	vec3  k_d;	// diffuse coefficient
	vec3  k_s;	// specular coefficient
	float n;	// specular exponent
};

struct Sphere {
	vec3     center;
	float    radius;
	Material mtl;
};

struct Light {
	vec3 position;
	vec3 intensity;
};

struct HitInfo {
	float    t;
	vec3     position;
	vec3     normal;
	Material mtl;
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;
uniform int bounceLimit;

bool IntersectSphere( vec3 pos, vec3 dir);
bool IntersectRay( inout HitInfo hit, Ray ray );

// Shades the given point and returns the computed color.
vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view )
{
	vec3 color = vec3(0,0,0);
	vec3 nrm = normalize(normal);
	for ( int i=0; i<NUM_LIGHTS; ++i ) {
		Light light = lights[i];
		
		// Check for shadows
		if (IntersectSphere(position, light.position - position))
			continue;

		// If not shadowed, perform shading using the Blinn model
		vec3 L = normalize(light.position - position);
		float cosTheta = dot(nrm, L);

		if (cosTheta > 0.0)
		{
			color += cosTheta * mtl.k_d;

			vec3 h = normalize(L + view);
			float cosPhi = dot(nrm, h);
			if (cosPhi > 0.0)
				color += mtl.k_s * pow(cosPhi, mtl.n);

			color *= light.intensity;
		}
		
		/*if ( mtl.k_s.r + mtl.k_s.g + mtl.k_s.b > 0.0 ) {
			vec3 dir = reflect( -view, nrm );
			color += mtl.k_s * textureCube( envMap, dir.xzy ).rgb;
		}*/
	}
	return color;
}

// Returns whether or not the ray intersects a sphere.
// Works like IntersectRay except does not record HitInfo and
// returns true on the first intersection found
bool IntersectSphere( vec3 pos, vec3 dir )
{
	for ( int i=0; i<NUM_SPHERES; ++i ) {
		Sphere sphere = spheres[i];

		// Test for ray-sphere intersection
		float a = dot(dir, dir);
		float b = 2.0 * dot(dir, pos - sphere.center);
		float c = dot(pos - sphere.center, pos - sphere.center) - pow(sphere.radius, 2.0);
		float delta = pow(b, 2.0) - 4.0 * a * c;

		// If intersection is found, returns true
		if (delta < 0.0)
			continue;

		// We check to see if the t value is past the bias
		float t = (-b - sqrt(delta))/(2.0 * a);
		if (t > 1e-7)
			return true;
	}
	return false;
}

// Intersects the given ray with all spheres in the scene
// and updates the given HitInfo using the information of the sphere
// that first intersects with the ray.
// Returns true if an intersection is found.
bool IntersectRay( inout HitInfo hit, Ray ray )
{
	hit.t = 1e30;
	bool foundHit = false;
	for ( int i=0; i<NUM_SPHERES; ++i ) {
		Sphere sphere = spheres[i];

		// Test for ray-sphere intersection
		float a = dot(ray.dir, ray.dir);
		float b = 2.0 * dot(ray.dir, ray.pos - sphere.center);
		float c = dot(ray.pos - sphere.center, ray.pos - sphere.center) - pow(sphere.radius, 2.0);
		float delta = pow(b, 2.0) - 4.0 * a * c;

		// If intersection is found, update the given HitInfo
		if (delta < 0.0)
			continue;

		float t = (-b - sqrt(delta))/(2.0 * a);

		// We always set the HitInfo to the closest sphere
		// The bias is important to prevent the ground from intersecting with itself
		if (t > hit.t || t < 1e-7)
			continue;
		
		foundHit = true;
		hit.t = t;
		hit.position = ray.pos + t * ray.dir;
		hit.normal = hit.position - sphere.center;
		hit.mtl = sphere.mtl;
	}
	return foundHit;
}

// Given a ray, returns the shaded color where the ray intersects a sphere.
// If the ray does not hit a sphere, returns the environment color.
vec4 RayTracer( Ray ray )
{
	HitInfo hit;
	if ( IntersectRay( hit, ray ) ) {
		vec3 view = normalize( -ray.dir );
		vec3 clr = Shade( hit.mtl, hit.position, hit.normal, view );

		// Compute reflections
		vec3 k_s = hit.mtl.k_s;
		for ( int bounce=0; bounce<MAX_BOUNCES; ++bounce ) {
			if ( bounce >= bounceLimit ) break;
			if ( hit.mtl.k_s.r + hit.mtl.k_s.g + hit.mtl.k_s.b <= 0.0 ) break;
			
			Ray r;	// this is the reflection ray
			HitInfo h;	// reflection hit info
			
			// Initialize the reflection ray
			r.pos = hit.position;
			r.dir = 2.0 * dot(normalize(-ray.dir), normalize(hit.normal)) * normalize(hit.normal) - normalize(-ray.dir);
			
			if ( IntersectRay( h, r ) ) {
				// Hit found, so shade the hit point
				clr += k_s * Shade(h.mtl, h.position, h.normal, normalize(-ray.dir));
				// Update the loop variables for tracing the next reflection ray
				k_s *= h.mtl.k_s;
				ray = r;
				hit = h;
			} else {
				// The refleciton ray did not intersect with anything,
				// so we are using the environment color
				clr += k_s * textureCube( envMap, r.dir.xzy ).rgb;
				break;	// no more reflections
			}
		}
		return vec4( clr, 1 );	// return the accumulated color, including the reflections
	} else {
		return vec4( textureCube( envMap, ray.dir.xzy ).rgb, 0 );	// return the environment color
	}
}
`;