
import * as Twisty from "./twisty.js";

class ShapeData {
	constructor(pieceCount, notation, pivotPrism, position, rotation, skinMaterials,
			partCount = 1, trunkPrism = 0, mergePrism = 0, turn = false,
			invertMergeMaterials = false, mergeFace = Twisty.SHAPE_MERGE_FACE_BOTTOM) {
		this.pieceCount = pieceCount;
		this.notation = notation;
		this.pivotPrism = pivotPrism;
		this.position = position;
		this.rotation = rotation;
		this.skinMaterials = skinMaterials;
		this.partCount = partCount;
		this.trunkPrism = trunkPrism;
		this.mergePrism = mergePrism;
		this.turn = turn;
		this.invertMergeMaterials = invertMergeMaterials;
		this.mergeFace = mergeFace;
	}
}

class Landscape {
	constructor(type, startCellX, startCellY, endCellX, endCellY, shapeData) {
		this.type = type;
		this.startCellX = startCellX;
		this.startCellY = startCellY;
		this.endCellX = endCellX;
		this.endCellY = endCellY;
		this.shapeData = shapeData;
		this.startX = startCellX * Twisty.PRISM_SIDE;
		this.startY = startCellY * Twisty.PRISM_SIDE;
		this.endX = endCellX * Twisty.PRISM_SIDE;
		this.endY = endCellY * Twisty.PRISM_SIDE;
		this.centerX = (this.startX + this.endX) / 2;
		this.centerY = (this.startY + this.endY) / 2;
		this.state = 0;
		this.shapeState = -1;
		this.shape = null;
	}
}

const LANDSCAPE_TYPE_LANDING = 1;
const LANDSCAPE_TYPE_MOUNTAIN = 2;
const LANDSCAPE_TYPE_HOLLOW = 3;

const GENERATOR_MOUNTAIN_PEAK_COUNT_MIN = 5;
const GENERATOR_MOUNTAIN_PEAK_COUNT_MAX = 10;
const GENERATOR_MOUNTAIN_SLOPE_WIDTH_MIN = 2;
const GENERATOR_MOUNTAIN_SLOPE_WIDTH_MAX = 5;

const LANDSCAPE_GENERATION_DISTANCE_MIN = 50;

const GRAVITY = 5;

const LANDER_THRUST_FORCE = 3.5;
const LANDER_THRUST_ANGLE = Math.PI / 6; // [radians]
const LANDER_THRUST_VECTOR = new THREE.Vector3(0, LANDER_THRUST_FORCE, 0).applyQuaternion(
		new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), LANDER_THRUST_ANGLE));

const LANDER_SHAPE_PIECE_COUNT = 17;
const LANDER_SHAPE_NOTATION = "1R1-2L3-2R1-3R1-4L3-4R3-5L1-5R1-6L1-7L3-6R1-8R1-8L3-9L3";
const LANDER_SHAPE_PIVOT_PRISM = 0;
const LANDER_SHAPE_POSITION = new THREE.Vector3();
const LANDER_SHAPE_ROTATION = new THREE.Quaternion()
		.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 4);
const LANDER_SHAPE_SKIN_MATERIALS = [ new THREE.MeshLambertMaterial({ color: 0xffffff }),
		new THREE.MeshLambertMaterial({ color: 0x87E752}) ];
const LANDER_SHAPE_PART_COUNT = 2;
const LANDER_SHAPE_TRUNK_PRISM = 8;
const LANDER_SHAPE_MERGE_PRISM = 8;
const LANDER_SHAPE_TURN = true;

const LANDING_LANDSCAPE_WIDTH = 4; // [cells]
const LANDING_LANDSCAPE_SURFACE_OFFSET_Y = 0.5 * Twisty.PRISM_SIDE;
const LANDING_LANDSCAPE_TREASURE_OFFSET_Y = -6.5 * Twisty.PRISM_SIDE;
const LANDING_LANDSCAPE_SHAPE_SKIN_MATERIALS = [ new THREE.MeshLambertMaterial({ color: 0xE6AA68 }),
		new THREE.MeshLambertMaterial({ color: 0xffffff }) ];
const LANDING_LANDSCAPE_SHAPE_DATA = [
		new ShapeData(24, "3L2-3R2-5R2-6L2-8L2-8R2-10R2-11L2", 0, new THREE.Vector3(),
				new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 4)
				.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)),
				LANDING_LANDSCAPE_SHAPE_SKIN_MATERIALS),
		new ShapeData(22, "1R3-3L2-4R3-5L3-6R2-8L3-8R3-10L2-11R3",
				0, new THREE.Vector3(Twisty.PRISM_HALF_SIDE, Twisty.PRISM_HALF_SIDE, 0),
				new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 4)
				.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2)),
				LANDING_LANDSCAPE_SHAPE_SKIN_MATERIALS),
		new ShapeData(30, "1R3-3L2-4R3-5L1-6L2-8R2-11L2-12L1-12R3-14L2-15R3",
				0, new THREE.Vector3(Twisty.PRISM_HALF_SIDE, Twisty.PRISM_HALF_SIDE, 0),
				new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 4)
				.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2)),
				LANDING_LANDSCAPE_SHAPE_SKIN_MATERIALS),
		new ShapeData(38, "1R3-3L2-4R3-5L1-6L2-7L2-8L2-10R2-13L2-14L2-15L2-16L1-16R3-18L2-19R3",
				0, new THREE.Vector3(Twisty.PRISM_HALF_SIDE, Twisty.PRISM_HALF_SIDE, 0),
				new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 4)
				.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2)),
				LANDING_LANDSCAPE_SHAPE_SKIN_MATERIALS),
		new ShapeData(46, "1R3-3L2-4R3-5L1-6L2-7L2-8L2-9L2-10L2-12R2-15L2-16L2-17L2-18L2-19L2-20L1-20R3-22L2-23R3",
				0, new THREE.Vector3(Twisty.PRISM_HALF_SIDE, Twisty.PRISM_HALF_SIDE, 0),
				new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2)
				.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 4)),
				LANDING_LANDSCAPE_SHAPE_SKIN_MATERIALS) ];

const MOUNTAIN_LANDSCAPE_SHAPE_PIVOT_PRISM = 0;
const MOUNTAIN_LANDSCAPE_SHAPE_POSITION = new THREE.Vector3();
const MOUNTAIN_LANDSCAPE_SHAPE_ROTATION = new THREE.Quaternion()
		.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 4);
const MOUNTAIN_LANDSCAPE_SHAPE_SKIN_MATERIALS = [ new THREE.MeshLambertMaterial({ color: 0x957FEF }),
		new THREE.MeshLambertMaterial({ color: 0xffffff }) ];

const TREASURE_SHAPE_PIECE_COUNT = 4;
const TREASURE_SHAPE_NOTATION = "1R2-2L2-2R2";
const TREASURE_SHAPE_PIVOT_PRISM = 0;
const TREASURE_SHAPE_POSITION = new THREE.Vector3(-Twisty.PRISM_HALF_SIDE, 0, 0);
const TREASURE_SHAPE_ROTATION = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -45);
const TREASURE_SHAPE_SKIN_MATERIALS = [ new THREE.MeshLambertMaterial({ color: 0xDE1A1A }) ];

const TREASURE_PICKING_ANIMATION_RAISE_HEIGHT = 4.5;
const TREASURE_PICKING_ANIMATION_ROTATE_ANGLE = 1.5 * Math.PI; // [radians]
const TREASURE_PICKING_ANIMATION_UPTAKE_HEIGHT = 7;
const TREASURE_PICKING_ANIMATION_TIME = 1.2; // [s]
const TREASURE_PICKING_ANIMATION_RAISE_TIME = 0.7; // [s]
const TREASURE_PICKING_ANIMATION_ROTATE_TIME = 1; // [s]

const CAMERA_FOV = 50; // [degrees]
const CAMERA_NEAR = 1;
const CAMERA_FAR = 100;
const CAMERA_DISTANCE = 20;
const CAMERA_ATTITUDE = Math.PI / 9; // [radians]
const CAMERA_ROTATION = new THREE.Quaternion()
		.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -CAMERA_ATTITUDE);
const CAMERA_TARGET = new THREE.Vector3(0, -5, 0);
const CAMERA_VECTOR = new THREE.Vector3(0, 0, 1).applyQuaternion(CAMERA_ROTATION)
		.multiplyScalar(CAMERA_DISTANCE).add(CAMERA_TARGET);
const LIGHT_POSITION = new THREE.Vector3(10, 30, 20);
const AMBIENT_INTENSITY = 0.4;
const DIFFUSE_INTENSITY = 0.6;

class TwistyLander {
	constructor() {
		this.renderer = null;
		this.clock = null;
		this.scene = null;
		this.camera = null;
		this.landerRigid = null;
		this.antialiasing = false;

		this.landerDirection = 0;
		this.landerStartPosition = new THREE.Vector3();
		this.landscapes = [ ];
		this.beneathLandscapeIndex = -1;
		this.contactLandscape = null;

		this.treasureView = null;
		this.treasureOrigin = null;
		this.treasureAnimationTime = 0;

		this.altitude = 0;
	}

	init(container) {
		this.renderer = new THREE.WebGLRenderer({ antialias: this.antialiasing });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		container.appendChild(this.renderer.domElement);

		this.clock = new THREE.Clock();

		this.scene = new Twisty.Scene();
		this.scene.onAfterRender =
				() => {
					this.updateLandscape();
				};
		this.scene.initPhysics();
		this.scene.setGravity(0, -GRAVITY, 0);

		var backgroundTexture = new THREE.TextureLoader().load("res/background.png");
		this.scene.background = backgroundTexture;

		this.camera = new THREE.PerspectiveCamera(CAMERA_FOV,
				window.innerWidth / window.innerHeight, CAMERA_NEAR, CAMERA_FAR);
		this.camera.quaternion.copy(CAMERA_ROTATION);

		var ambientLight = new THREE.AmbientLight(0xffffff, AMBIENT_INTENSITY);
		this.scene.add(ambientLight);

		var directionalLight = new THREE.DirectionalLight(0xffffff, DIFFUSE_INTENSITY);
		directionalLight.position.copy(LIGHT_POSITION);
		this.scene.add(directionalLight);

		var loader = new THREE.GLTFLoader();
		loader.load("res/prism.gltf",
				(gltf) => {
					var prismMesh = gltf.scene.children.find(child => child.name == "Prism");
					if (prismMesh) {
						this.initScene(prismMesh.geometry);
					} else {
						throw new Error("Prism mesh not found");
					}
				});
	}

	initScene(prismGeometry) {
		this.scene.setPrismGeometry(prismGeometry);

		this.generateNextMountain();
		this.createNextLanding();
		this.generateNextMountain();

		this.createLander(new THREE.Vector3());

		for (var landscape of this.landscapes) {
			this.createLandscape(landscape);
		}
	}

	resizeViewport() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	render() {
		var dt = this.clock.getDelta();

		this.updateScene(dt);

		this.renderer.render(this.scene, this.camera);
	}

	updateScene(dt) {
		if (this.landerDirection && this.landerRigid) {
			this.landerRigid.body.applyCentralForce(new Ammo.btVector3(
					-this.landerDirection * LANDER_THRUST_VECTOR.x,
					LANDER_THRUST_VECTOR.y, LANDER_THRUST_VECTOR.z));
		}

		this.scene.updatePhysics(dt);

		if (this.treasureView != null) {
			this.animateTreasurePicking(dt);
		}

		if (this.landerRigid) {
			var landerPosition = this.landerRigid.view.position;

			if (this.landscapes.length > 0) {
				while (landerPosition.x - LANDSCAPE_GENERATION_DISTANCE_MIN < this.landscapes[0].startX) {
					this.createPrevLanding();
					this.generatePrevMountain();
				}
				while (landerPosition.x + LANDSCAPE_GENERATION_DISTANCE_MIN > this.landscapes[this.landscapes.length - 1].endX) {
					this.createNextLanding();
					this.generateNextMountain();
				}
			}

			this.beneathLandscapeIndex = this.findBeneathLandscapeIndex(
					landerPosition, this.beneathLandscapeIndex);
			var landscapeY = 0;
			if (this.beneathLandscapeIndex != -1) {
				var beneathLandscape = this.landscapes[this.beneathLandscapeIndex];
				landscapeY = THREE.Math.lerp(beneathLandscape.startY, beneathLandscape.endY,
						THREE.Math.clamp((landerPosition.x - beneathLandscape.startX)
						/ (beneathLandscape.endX - beneathLandscape.startX), 0.0, 1.0));
			}
			this.altitude = landerPosition.y - landscapeY;

			this.camera.position.copy(landerPosition).add(CAMERA_VECTOR);
		}
	}

	joinLandscape(landscape) {
		if (this.landscapes.length == 0) {
			this.landscapes.push(landscape);
		} else {
			var frontLandscape = this.landscapes[0];
			var backLandscape = this.landscapes[this.landscapes.length - 1];
			if ((landscape.startCellX == backLandscape.endCellX)
					&& (landscape.startCellY == backLandscape.endCellY)) {
				this.landscapes.push(landscape);
			} else if ((landscape.endCellX == frontLandscape.startCellX)
					&& (landscape.endCellY == frontLandscape.startCellY)) {
				this.landscapes.unshift(landscape);
				this.beneathLandscapeIndex = -1;
			} else {
				throw new Error("Landscape should be joined continuously: L={" + landscape.startCellX
						+ " " + landscape.startCellY + " " + landscape.endCellX + " " + landscape.endCellY
						+ "}, F={" + frontLandscape.startCellX + " " + frontLandscape.startCellY + " "
						+ frontLandscape.endCellX + " " + frontLandscape.endCellY + "}, B={" + backLandscape.startCellX
						+ " " + backLandscape.startCellY + " " + backLandscape.endCellX + " " + backLandscape.endCellY + "}");
			}
		}
	}

	createLander(position) {
		var landerShapePart = new Twisty.Shape(LANDER_SHAPE_PIECE_COUNT, LANDER_SHAPE_NOTATION);
		var landerPrisms = landerShapePart.generatePatternPrisms(LANDER_SHAPE_PIVOT_PRISM,
				LANDER_SHAPE_POSITION, LANDER_SHAPE_ROTATION,
				LANDER_SHAPE_PART_COUNT, LANDER_SHAPE_TRUNK_PRISM,
				LANDER_SHAPE_MERGE_PRISM, LANDER_SHAPE_TURN, LANDER_SHAPE_SKIN_MATERIALS);
				//CATEGORY_LANDER, CATEGORY_LANDER | CATEGORY_LANDSCAPE);
		var landerOrigin = Twisty.Prism.computeOrigin(landerPrisms);
		var landerAABB = Twisty.Prism.computeOverallAABB(landerPrisms);

		var nearestLandingIndex = this.findNearestLandscapeIndex(LANDSCAPE_TYPE_LANDING, position);
		if (nearestLandingIndex != -1) {
			var nearestLanding = this.landscapes[nearestLandingIndex];
			this.landerStartPosition.set(nearestLanding.centerX,
					nearestLanding.centerY + LANDING_LANDSCAPE_SURFACE_OFFSET_Y
					- (landerAABB.min.y - landerOrigin.y), 0);
		} else {
			this.landerStartPosition.set(0, 0, 0);
		}
		this.landerStartPosition.y += Twisty.PRISM_SHAPE_MARGIN;

		this.landerRigid = this.scene.createShapeRigid(landerPrisms,
				this.landerStartPosition, new THREE.Quaternion());
		var landerConstraint = this.scene.createGeneric6DofConstraint(this.landerRigid.body);
		this.scene.setLinearConstraintLimits(landerConstraint,
				-Infinity, Infinity, -Infinity, Infinity, 0, 0);
		this.scene.setAngularConstraintLimits(landerConstraint,
				0, 0, 0, 0, 0, 0);

		//this.landerRigid.body.setFriction(friction);
		//this.landerRigid.body.setRestitution(.9);
		//this.landerRigid.body.setDamping(0.2, 0.2);

		//this.mainCombustionParticleSystem = this.createCombustionParticleSystem(1, 0, 0);
		//this.leftCombustionParticleSystem = this.createCombustionParticleSystem(LANDER_SIDE_JET_COMBUSTION_SCALE,
		//		-LANDER_SIDE_JET_COMBUSTION_POSITION_X, LANDER_SIDE_JET_COMBUSTION_ANGLE_Y);
		//this.rightCombustionParticleSystem = this.createCombustionParticleSystem(LANDER_SIDE_JET_COMBUSTION_SCALE,
		//		LANDER_SIDE_JET_COMBUSTION_POSITION_X, -LANDER_SIDE_JET_COMBUSTION_ANGLE_Y);
		//this.landerRigid.view.attachGeometry(this.mainCombustionParticleSystem);
		//this.landerRigid.view.attachGeometry(this.leftCombustionParticleSystem);
		//this.landerRigid.view.attachGeometry(this.rightCombustionParticleSystem);
	}

	createLanding(cellX, cellY) {
		this.joinLandscape(new Landscape(LANDSCAPE_TYPE_LANDING, cellX, cellY,
				cellX + LANDING_LANDSCAPE_WIDTH, cellY, LANDING_LANDSCAPE_SHAPE_DATA));
	}

	createMountain(cellX, cellY, slopeWidths) {
		if (slopeWidths.length < 1) {
			throw new Error("Mountain must have at least 1 slope, but it has " + slopeWidths.length);
		}
		var mountainWidth = 0;
		var mountainHeight = 0;
		var mountainNotation = "";
		for (var i = 0; i < slopeWidths.length; i++) {
			var slopeWidth = slopeWidths[i];
			if (slopeWidth <= 0) {
				throw new Error("Slope cannot have zero or negative width (" + slopeWidth + ")");
			}
			if (i > 0) {
				if (i > 1) {
					mountainNotation += '-';
				}
				mountainNotation += (mountainWidth + 1) + "L2";
			}
			mountainWidth += slopeWidth;
			mountainHeight += ((i & 1) == 0) ? slopeWidth : -slopeWidth;
		}
		var shapeData = new ShapeData(2 * mountainWidth,
				mountainNotation, MOUNTAIN_LANDSCAPE_SHAPE_PIVOT_PRISM,
				MOUNTAIN_LANDSCAPE_SHAPE_POSITION, MOUNTAIN_LANDSCAPE_SHAPE_ROTATION,
				MOUNTAIN_LANDSCAPE_SHAPE_SKIN_MATERIALS);
		this.joinLandscape(new Landscape(LANDSCAPE_TYPE_MOUNTAIN, cellX, cellY,
				cellX + mountainWidth, cellY + mountainHeight, [ shapeData ]));
	}

	createNextLanding() {
		var cellX = 0;
		var cellY = 0;
		if (this.landscapes.length > 0) {
			var prevLandscape = this.landscapes[this.landscapes.length - 1];
			cellX = prevLandscape.endCellX;
			cellY = prevLandscape.endCellY;
		}
		this.createLanding(cellX, cellY);
	}

	createNextMountain(slopeWidths) {
		var cellX = 0;
		var cellY = 0;
		if (this.landscapes.length > 0) {
			var prevLandscape = this.landscapes[this.landscapes.length - 1];
			cellX = prevLandscape.endCellX;
			cellY = prevLandscape.endCellY;
		}
		this.createMountain(cellX, cellY, slopeWidths);
	}

	createPrevLanding() {
		var cellX = 0;
		var cellY = 0;
		if (this.landscapes.length > 0) {
			var nextLandscape = this.landscapes[0];
			cellX = nextLandscape.startCellX;
			cellY = nextLandscape.startCellY;
		}
		cellX -= LANDING_LANDSCAPE_WIDTH;
		this.createLanding(cellX, cellY);
	}

	createPrevMountain(slopeWidths) {
		var cellX = 0;
		var cellY = 0;
		if (this.landscapes.length > 0) {
			var nextLandscape = this.landscapes[0];
			cellX = nextLandscape.startCellX;
			cellY = nextLandscape.startCellY;
		}
		for (var i = 0; i < slopeWidths.length; i++) {
			var slopeWidth = slopeWidths[i];
			cellX -= slopeWidth;
			cellY -= ((i & 1) == 0) ? slopeWidth : -slopeWidth;
		}
		this.createMountain(cellX, cellY, slopeWidths);
	}

	generateNextMountain() {
		var peakCount = GENERATOR_MOUNTAIN_PEAK_COUNT_MIN + Math.floor(Math.random()
				* (GENERATOR_MOUNTAIN_PEAK_COUNT_MAX - GENERATOR_MOUNTAIN_PEAK_COUNT_MIN + 1));
		for (var i = 0; i < peakCount; i++) {
			var slopeWidth1 = GENERATOR_MOUNTAIN_SLOPE_WIDTH_MIN + Math.floor(Math.random()
					* (GENERATOR_MOUNTAIN_SLOPE_WIDTH_MAX - GENERATOR_MOUNTAIN_SLOPE_WIDTH_MIN + 1));
			var slopeWidth2 = GENERATOR_MOUNTAIN_SLOPE_WIDTH_MIN + Math.floor(Math.random()
					* (GENERATOR_MOUNTAIN_SLOPE_WIDTH_MAX - GENERATOR_MOUNTAIN_SLOPE_WIDTH_MIN + 1));
			//if ((i == peakCount / 2) && (peakCount >= 2)) {
			//	createNextHollow();
			//}
			this.createNextMountain([ slopeWidth1, slopeWidth2 ]);
		}
	}

	generatePrevMountain() {
		var peakCount = GENERATOR_MOUNTAIN_PEAK_COUNT_MIN + Math.floor(Math.random()
				* (GENERATOR_MOUNTAIN_PEAK_COUNT_MAX - GENERATOR_MOUNTAIN_PEAK_COUNT_MIN + 1));
		for (var i = 0; i < peakCount; i++) {
			var slopeWidth1 = GENERATOR_MOUNTAIN_SLOPE_WIDTH_MIN + Math.floor(Math.random()
					* (GENERATOR_MOUNTAIN_SLOPE_WIDTH_MAX - GENERATOR_MOUNTAIN_SLOPE_WIDTH_MIN + 1));
			var slopeWidth2 = GENERATOR_MOUNTAIN_SLOPE_WIDTH_MIN + Math.floor(Math.random()
					* (GENERATOR_MOUNTAIN_SLOPE_WIDTH_MAX - GENERATOR_MOUNTAIN_SLOPE_WIDTH_MIN + 1));
			//if ((i == peakCount / 2) && (peakCount >= 2)) {
			//	createPrevHollow();
			//}
			this.createPrevMountain([ slopeWidth1, slopeWidth2 ]);
		}
	}

	createLandscape(landscape) {
		if ((landscape.shape != null) || (landscape.shapeData.length == 0)) {
			return;
		}
		if ((landscape.state < 0) || (landscape.state >= landscape.shapeData.length)) {
			console.error("Landscape state (" + landscape.state + ") is out of range [0.."
					+ landscape.shapeData.length + ")");
			return;
		}

		var shapeData = landscape.shapeData[landscape.state];
		var shape = new Twisty.Shape(shapeData.pieceCount, shapeData.notation);
		//int categoryBits;
		//switch (landscape.type) {
		//case LandscapeType::LANDING:
		//	categoryBits = TLConst.CATEGORY_LANDING;
		//	break;
		// case LandscapeType::MOUNTAIN:
		// 	categoryBits = TLConst.CATEGORY_MOUNTAIN;
		// 	break;
		// case LandscapeType::HOLLOW:
		// 	categoryBits = TLConst.CATEGORY_HOLLOW;
		// 	break;
		// default:
		// 	categoryBits = 0;
		// 	break;
		// }
		var prisms;
		if (shapeData.partCount > 1) {
			prisms = shape.generatePatternPrisms(shapeData.pivotPrism,
					new THREE.Vector3(landscape.startX, landscape.startY, 0).add(shapeData.position),
					shapeData.rotation, shapeData.partCount,
					shapeData.trunkPrism, shapeData.mergePrism,
					shapeData.turn, shapeData.skinMaterials,
					shapeData.invertMergeMaterials, shapeData.mergeFace);
					//categoryBits, TLConst.CATEGORY_LANDER);
		} else {
			prisms = shape.generatePrisms(shapeData.pivotPrism,
					new THREE.Vector3(landscape.startX, landscape.startY, 0).add(shapeData.position),
					shapeData.rotation, shapeData.skinMaterials);
					//categoryBits, TLConst.CATEGORY_LANDER);
		}
		landscape.shape = this.scene.createShapeImmovable(prisms);
		//landscape.shape.setGeomData(landscape.get());
		landscape.shapeState = landscape.state;
	}

	destroyLandscape(landscape) {
		if (landscape.shape != null) {
			this.scene.destroyShapeImmovable(landscape.shape);
			landscape.shape = null;
		}
	}

	findNearestLandscapeIndex(landscapeType, position) {
		var nearestLandscapeIndex = -1;
		var nearestLandscapeDistance = 0;
		for (var i = 0; i < this.landscapes.length; i++) {
			var landscape = this.landscapes[i];
			if (landscape.type != landscapeType) {
				continue;
			}
			var landscapeCenter = new THREE.Vector3(landscape.centerX, landscape.centerY, 0);
			var distance = landscapeCenter.distanceTo(position);
			if ((nearestLandscapeIndex == -1) || (distance < nearestLandscapeDistance)) {
				nearestLandscapeIndex = i;
				nearestLandscapeDistance = distance;
			}
		}
		return nearestLandscapeIndex;
	}

	findBeneathLandscapeIndex(position, prevIndex = -1) {
		if (this.landscapes.length == 0) {
			return -1;
		}
		if ((prevIndex >= 0) && (prevIndex < this.landscapes.length)) {
			var prevLandscape = this.landscapes[prevIndex];
			if ((position.x >= prevLandscape.startX) && (position.x <= prevLandscape.endX)) {
				return prevIndex;
			}
			if (position.x < prevLandscape.endX) {
				for (var i = prevIndex - 1; i >= 0; i--) {
					var landscape = this.landscapes[i];
					if ((position.x >= landscape.startX) && (position.x <= landscape.endX)) {
						return i;
					}
				}
			} else {
				for (var i = prevIndex + 1; i < this.landscapes.length; i++) {
					var landscape = this.landscapes[i];
					if ((position.x >= landscape.startX) && (position.x <= landscape.endX)) {
						return i;
					}
				}
			}
		} else {
			for (var i = 0; i < this.landscapes.length; i++) {
				var landscape = this.landscapes[i];
				if ((position.x >= landscape.startX) && (position.x <= landscape.endX)) {
					return i;
				}
			}
		}
		var frontLandscape = this.landscapes[0];
		var backLandscape = this.landscapes[this.landscapes.length - 1];
		if (Math.abs(frontLandscape.startX - position.x)
				<= Math.abs(backLandscape.endX - position.x)) {
			return 0;
		} else {
			return this.landscapes.length - 1;
		}
	}

	updateLandscape() {
		for (var landscape of this.landscapes) {
			var startPosition = new THREE.Vector3(landscape.startX, landscape.startY, 0).project(this.camera);
			var endPosition = new THREE.Vector3(landscape.endX, landscape.endY, 0).project(this.camera);

			if (landscape.shape != null) {
				if ((startPosition.x > 1.2) || (endPosition.x < -1.2)) {
					this.destroyLandscape(landscape);
				} else if (landscape.shapeState != landscape.state) {
					this.destroyLandscape(landscape);
					this.createLandscape(landscape);
				}
			} else {
				if ((startPosition.x < 1.1) && (endPosition.x > -1.1)) {
					this.createLandscape(landscape);
				}
			}
		}
	}

	digLanding() {
		// XXX for testing
		if (this.beneathLandscapeIndex != -1) {
			this.contactLandscape = this.landscapes[this.beneathLandscapeIndex];
		}
		//if ((contactLandscape == null) || (contactLandscape.type != LandscapeType::LANDING)) {
		//	return;
		//}

		if (this.contactLandscape.state < this.contactLandscape.shapeData.length - 1) {
			this.contactLandscape.state++;
			if (this.contactLandscape.state == this.contactLandscape.shapeData.length - 1) {
				this.landingExcavated(this.contactLandscape);
			}
		}
	}

	landingExcavated(landscape) {
		if (Math.random() > 0.5) {
			//foundTreasures++;
			this.createTreasureView(landscape);
		}
	}

	createTreasureView(landscape) {
		if (this.treasureView != null) {
			this.destroyTreasureView();
		}

		var treasureShape = new Twisty.Shape(TREASURE_SHAPE_PIECE_COUNT, TREASURE_SHAPE_NOTATION);
		var treasurePrisms = treasureShape.generatePrisms(TREASURE_SHAPE_PIVOT_PRISM,
				new THREE.Vector3(landscape.centerX, landscape.centerY + LANDING_LANDSCAPE_TREASURE_OFFSET_Y, 0)
				.add(TREASURE_SHAPE_POSITION), TREASURE_SHAPE_ROTATION, TREASURE_SHAPE_SKIN_MATERIALS);
		this.treasureView = this.scene.createShapeView(treasurePrisms);
		this.treasureOrigin = this.treasureView.position.clone();
		this.treasureAnimationTime = 0;
	}

	destroyTreasureView() {
		if (this.treasureView != null) {
			this.scene.destroyShapeView(this.treasureView);
			this.treasureView = null;
		}
	}

	animateTreasurePicking(dt) {
		this.treasureAnimationTime += dt;
		if (this.treasureAnimationTime < TREASURE_PICKING_ANIMATION_TIME) {
			var raiseProgress = THREE.Math.smoothstep(this.treasureAnimationTime, 0, TREASURE_PICKING_ANIMATION_RAISE_TIME);
			var rotateProgress = THREE.Math.smoothstep(this.treasureAnimationTime, 0, TREASURE_PICKING_ANIMATION_ROTATE_TIME);
			var uptakeProgress = THREE.Math.smoothstep(this.treasureAnimationTime, TREASURE_PICKING_ANIMATION_RAISE_TIME, TREASURE_PICKING_ANIMATION_TIME);
			var raiseHeight = raiseProgress * TREASURE_PICKING_ANIMATION_RAISE_HEIGHT;
			var rotateAngle = rotateProgress * TREASURE_PICKING_ANIMATION_ROTATE_ANGLE; // [radians]
			var uptakeHeight = uptakeProgress * TREASURE_PICKING_ANIMATION_UPTAKE_HEIGHT;
			this.treasureView.position.set(0, raiseHeight + uptakeHeight, 0).add(this.treasureOrigin);
			this.treasureView.rotation.y = rotateAngle;
		} else {
			this.destroyTreasureView();
		}
	}

	moveLeft() {
		this.landerDirection = -1;
	}

	moveRight() {
		this.landerDirection = 1;
	}

	stopMove() {
		this.landerDirection = 0;
	}

	stopMoveLeft() {
		if (this.landerDirection == -1) {
			this.landerDirection = 0;
		}
	}

	stopMoveRight() {
		if (this.landerDirection == 1) {
			this.landerDirection = 0;
		}
	}
}

var container = document.getElementById("container");

var twistyLander = new TwistyLander();
twistyLander.init(container);

window.addEventListener("resize", () => {
	twistyLander.resizeViewport();
}, false);

document.addEventListener("keydown", (event) => {
	switch (event.key) {
		case "ArrowLeft":
			twistyLander.moveLeft();
			break;
		case "ArrowRight":
			twistyLander.moveRight();
			break;
	}
}, false);

document.addEventListener("keyup", (event) => {
	switch (event.key) {
		case "ArrowLeft":
			twistyLander.stopMoveLeft();
			break;
		case "ArrowRight":
			twistyLander.stopMoveRight();
			break;
		case "ArrowDown":
			twistyLander.digLanding();
			break;
	}
}, false);

var activeTouchId = null;
var activeTouchRelX;

container.addEventListener("touchstart", (event) => {
	event.preventDefault();

	var touch = event.changedTouches[0];
	activeTouchId = touch.identifier;
	activeTouchRelX = touch.pageX / window.innerWidth;
	if (activeTouchRelX < 0.4) {
		twistyLander.moveLeft();
	} else if (activeTouchRelX > 0.6) {
		twistyLander.moveRight();
	} else {
		twistyLander.stopMove();
	}
}, false);

container.addEventListener("touchend", (event) => {
	event.preventDefault();

	if (activeTouchId !== null) {
		var touches = event.changedTouches;
		for (var i = 0; i < touches.length; i++) {
			var touch = touches[i];
			if (touch.identifier == activeTouchId) {
				if (activeTouchRelX < 0.4) {
					twistyLander.stopMoveLeft();
				} else if (activeTouchRelX > 0.6) {
					twistyLander.stopMoveRight();
				} else {
					twistyLander.digLanding();
				}
				activeTouchId = null;
				break;
			}
		}
	}
}, false);

function animate() {
	requestAnimationFrame(animate);

	twistyLander.render();
}

animate();
