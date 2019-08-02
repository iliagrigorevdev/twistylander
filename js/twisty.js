
export const PRISM_HEIGHT = 1;
export const PRISM_HALF_HEIGHT = PRISM_HEIGHT / 2;
export const PRISM_BASE = 2 * PRISM_HEIGHT;
export const PRISM_HALF_BASE = PRISM_BASE / 2;
export const PRISM_DISTANCE = PRISM_BASE / 2;
export const PRISM_HALF_DISTANCE = PRISM_DISTANCE / 2;
export const PRISM_SIDE = Math.sqrt(PRISM_BASE);
export const PRISM_HALF_SIDE = PRISM_SIDE / 2;
export const PRISM_LEFT_SLOPE_PIVOT_POINT = new THREE.Vector3(-PRISM_HALF_DISTANCE, 0, 0);
export const PRISM_RIGHT_SLOPE_PIVOT_POINT = new THREE.Vector3(PRISM_HALF_DISTANCE, 0, 0);
export const PRISM_BOTTOM_PIVOT_POINT = new THREE.Vector3(0, -PRISM_HALF_HEIGHT, 0);
export const PRISM_LEFT_SLOPE_NORMAL = new THREE.Vector3(0, 1, 0).applyQuaternion(
		new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 4));
export const PRISM_RIGHT_SLOPE_NORMAL = new THREE.Vector3(0, 1, 0).applyQuaternion(
		new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 4));
export const PRISM_MERGE_BOTTOM_POSITION = new THREE.Vector3(0, -PRISM_HEIGHT, 0);
export const PRISM_MERGE_FRONT_POSITION = new THREE.Vector3(0, 0, -PRISM_SIDE);
export const PRISM_MERGE_BACK_POSITION = new THREE.Vector3(0, 0, PRISM_SIDE);
export const PRISM_MERGE_PIVOT_POINT = new THREE.Vector3(0, 0, 0);
export const PRISM_JOINT_CONNECTION_SQUARED_DISTANCE_EPS = 1e-3;
export const PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS = 1e-3;

export const PRISM_VERTICES = [
		new THREE.Vector3(-PRISM_HALF_BASE, -PRISM_HALF_HEIGHT, -PRISM_HALF_SIDE),
		new THREE.Vector3(-PRISM_HALF_BASE, -PRISM_HALF_HEIGHT, PRISM_HALF_SIDE),
		new THREE.Vector3(0, PRISM_HALF_HEIGHT, -PRISM_HALF_SIDE),
		new THREE.Vector3(0, PRISM_HALF_HEIGHT, PRISM_HALF_SIDE),
		new THREE.Vector3(PRISM_HALF_BASE, -PRISM_HALF_HEIGHT, -PRISM_HALF_SIDE),
		new THREE.Vector3(PRISM_HALF_BASE, -PRISM_HALF_HEIGHT, PRISM_HALF_SIDE) ];

export const PRISM_MASS = 0.01;
export const PRISM_SHAPE_MARGIN = 0.04;

export const SHAPE_MERGE_FACE_BOTTOM = 1;
export const SHAPE_MERGE_FACE_FRONT = 2;
export const SHAPE_MERGE_FACE_BACK = 3;

export const DEFAULT_PHYSICS_MAX_SUB_STEPS = 10;
export const DEFAULT_PHYSICS_FIXED_TIME_STEP = 1 / 60;
export const DEFAULT_PHYSICS_MAX_TIME_STEP = DEFAULT_PHYSICS_MAX_SUB_STEPS * DEFAULT_PHYSICS_FIXED_TIME_STEP;

export class Prism {
	constructor(index) {
		this.index = index;
		this.head = false;
		this.tail = false;
		this.prevPrism = null;
		this.nextPrism = null;
		this.midPrism = null;
		this.frontPrism = null;
		this.backPrism = null;
		this.position = new THREE.Vector3();
		this.orientation = new THREE.Quaternion();
		this.material = null;
	}

	static computeOrigin(prisms) {
		var origin = new THREE.Vector3();
		if (prisms.length > 0) {
			for (var prism of prisms) {
				origin.add(prism.position);
			}
			origin.divideScalar(prisms.length);
		}
		return origin;
	}

	static computePrismAABB(prismPosition, prismOrientation) {
		var aabb = new THREE.Box3();
		for (var prismVertice of PRISM_VERTICES) {
			var vertice = prismVertice.clone().applyQuaternion(prismOrientation).add(prismPosition);
			aabb.expandByPoint(vertice);
		}
		return aabb;
	}

	computeAABB() {
		return Prism.computePrismAABB(this.position, this.orientation);
	}

	computeParentAABB(origin, parentPosition, parentOrientation) {
		return Prism.computePrismAABB(this.position.clone().sub(origin)
				.applyQuaternion(parentOrientation).add(parentPosition),
				this.orientation.premultiply(parentOrientation));
	}

	static computeOverallAABB(prisms) {
		var aabb = new THREE.Box3();
		for (var prism of prisms) {
			var prismAabb = prism.computeAABB();
			aabb.expandByPoint(prismAabb.min).expandByPoint(prismAabb.max);
		}
		return aabb;
	}

	static computeParentOverallAABB(prisms, origin, parentPosition, parentOrientation) {
		var aabb = new THREE.Box3();
		for (var prism of prisms) {
			var prismAabb = prism.computeParentAABB(origin, parentPosition, parentOrientation);
			aabb.expandByPoint(prismAabb.min).expandByPoint(prismAabb.max);
		}
		return aabb;
	}

	translate(translation) {
		this.position.add(translation);
	}

	rotate(pivot, rotation) {
		this.position.sub(pivot).applyQuaternion(rotation).add(pivot);
		this.orientation.premultiply(rotation);
	}

	transform(pivot, translation, rotation) {
		this.position.sub(pivot).applyQuaternion(rotation).add(pivot).add(translation);
		this.orientation.premultiply(rotation);
	}

	static translateAll(prisms, translation) {
		for (var prism of prisms) {
			prism.translate(translation);
		}
	}

	static rotateAll(prisms, pivot, rotation) {
		for (var prism of prisms) {
			prism.rotate(pivot, rotation);
		}
	}

	static transformAll(prisms, pivot, translation, rotation) {
		for (var prism of prisms) {
			prism.transform(pivot, translation, rotation);
		}
	}
}

export class PrismFormation {
	constructor(pieceCount, notation, pivotPrism, position = new THREE.Vector3(),
			rotation = new THREE.Quaternion(), partCount = 1, trunkPrism = 0,
			mergePrism = 0, turn = false, mergeFace = SHAPE_MERGE_FACE_BOTTOM) {
		this.pieceCount = pieceCount;
		this.notation = notation;
		this.pivotPrism = pivotPrism;
		this.position = position;
		this.rotation = rotation;
		this.partCount = partCount;
		this.trunkPrism = trunkPrism;
		this.mergePrism = mergePrism;
		this.turn = turn;
		this.mergeFace = mergeFace;
	}
}

export class Shape {
	constructor(pieceCount, notation) {
		this.pieceCount = pieceCount;
		this.prismTransforms = Shape.createPrismTransforms(pieceCount);

		if (notation) {
			this.fold(notation);
		}
	}

	static createPrismTransforms(pieceCount) {
		var prismTransforms = new Array(pieceCount);
		for (var i = 0; i < prismTransforms.length; i++) {
			var downwardFacing = ((i & 1) == 0);
			prismTransforms[i] = {
					position: new THREE.Vector3(i * PRISM_DISTANCE, 0, 0),
					orientation: new THREE.Quaternion().setFromAxisAngle(
							new THREE.Vector3(1, 0, 0), (downwardFacing ? 0 : Math.PI)) };
		}
		return prismTransforms;
	}

	/**
	 * Fold the shape using a notation in the following format:
	 * 1. Number of the downward-facing prism (from the left): 1 to (pieceCount+1)/2
	 * 2. Left or right sloping side of the prism: L or R
	 * 3. Position of the twist towards you: 1, 2 or 3
	 *
	 * Example: 1R2-2R2-3L2-4L2-6L2-6R2-7R2-9L2-10L2-10R2
	 *
	 * @return true if no errors, otherwise false.
	 */
	fold(notation) {
		var tokens = notation.split("-");
		for (var token of tokens) {
			var pos;
			var left;
			if ((pos = token.indexOf('L')) != -1) {
				left = true;
			} else if ((pos = token.indexOf('R')) != -1) {
				left = false;
			} else {
				console.error("Not found L or R sloping side in the token: " + token);
				return false;
			}
			var downwardPrismNumberStr = token.substring(0, pos);
			if (!downwardPrismNumberStr) {
				console.error("Empty downward-facing prism index in the token: " + token);
				return false;
			}
			var downwardPrismNumber = parseInt(downwardPrismNumberStr, 10);
			var prism = (downwardPrismNumber - 1) * 2;

			if ((prism < 0) || (prism >= this.pieceCount)) {
				console.error("Downward-facing prism index (" + downwardPrismNumber +
						") is out of range [1.." + (this.pieceCount + 1) / 2 + "] in the token: " + token);
				return false;
			}
			var twistsStr = token.substring(pos + 1);
			if (!twistsStr) {
				console.error("Empty number of twists in the token: " + token);
				return false;
			}
			var twists = parseInt(twistsStr, 10);
			if (twists == 0) {
				continue; // no twist
			}
			if ((twists < 1) || (twists > 3)) {
				console.error("Number of twists (" + twists + ") is out of range in the token: " + token);
				return false;
			}

			if (twists < 3) {
				for (var i = 0; i < twists; i++) {
					if (!this.twist(prism, left, left)) {
						return false;
					}
				}
			} else {
				if (!this.twist(prism, left, !left)) {
					return false;
				}
			}
		}
		return true;
	}

	/**
	 * Twist left or right adjacent prisms around a downward-facing prism
	 * 90 degrees counter-clockwise or clockwise.
	 *
	 * @param prism index of a prism in range [0..pieceCount).
	 * @param left twist left (true) or right (false) adjacent prisms.
	 * @param ccw twist counter-clockwise (true) or clockwise (false).
	 *
	 * @return true if prism index is in range, otherwise false.
	 */
	twist(prism, left, ccw) {
		if ((prism < 0) || (prism >= this.pieceCount)) {
			console.error("Prism index (" + prism + ") out of range [0.." + this.pieceCount + ")");
			return false;
		}

		var pivotPoint = this.prismTransforms[prism].position.clone().add(
				(left ? PRISM_LEFT_SLOPE_PIVOT_POINT : PRISM_RIGHT_SLOPE_PIVOT_POINT).clone()
				.applyQuaternion(this.prismTransforms[prism].orientation));
		var slopeNormal = (left ? PRISM_LEFT_SLOPE_NORMAL : PRISM_RIGHT_SLOPE_NORMAL).clone()
				.applyQuaternion(this.prismTransforms[prism].orientation);

		var twistAngle = (ccw ? 1 : -1) * Math.PI / 2;
		var rotation = new THREE.Quaternion().setFromAxisAngle(slopeNormal, twistAngle);

		if (left) {
			for (var i = prism - 1; i >= 0; i--) {
				Shape.twistPrism(pivotPoint, rotation, this.prismTransforms[i]);
			}
		} else {
			for (var i = prism + 1; i < this.pieceCount; i++) {
				Shape.twistPrism(pivotPoint, rotation, this.prismTransforms[i]);
			}
		}

		return true;
	}

	static twistPrism(pivotPoint, rotation, transform) {
		transform.position.sub(pivotPoint).applyQuaternion(rotation).add(pivotPoint);
		transform.orientation.premultiply(rotation).normalize();
	}

	/**
	 * Check the shape for closure (i.e. the head prism is connected to the tail prism).
	 */
	isClosed() {
		if (this.prismTransforms.length < 2) {
			return false;
		}

		var headTransform = this.prismTransforms[0];
		var tailTransform = this.prismTransforms[this.prismTransforms.length - 1];

		var headLeftPivot = PRISM_LEFT_SLOPE_PIVOT_POINT.clone()
				.applyQuaternion(headTransform.orientation).add(headTransform.position);
		var tailRightPivot = PRISM_RIGHT_SLOPE_PIVOT_POINT.clone()
				.applyQuaternion(tailTransform.orientation).add(tailTransform.position);

		return (headLeftPivot.distanceToSquared(tailRightPivot)
				< PRISM_JOINT_CONNECTION_SQUARED_DISTANCE_EPS);
	}

	/**
	 * Create shape prisms.
	 *
	 * @param pivotPrism index of the pivot prism in range [0..pieceCount).
	 * @param position center position of the pivot prism.
	 * @param rotation bottom face rotation of the pivot prism.
	 * @param materials cyclic materials of prisms.
	 * @param invertMaterials use materials in reverse or direct sequence.
	 * @param linkMidPrisms make connections between prism base faces.
	 * @param linkSidePrisms make connections between prism front and back triangles.
	 * @param pivotPoint point on the pivot prism which will be moved to the specified position.
	 *
	 * @return array of generated prisms.
	 */
	generatePrisms(pivotPrism, position, rotation, materials, invertMaterials = false,
			linkMidPrisms = true, linkSidePrisms = true,
			pivotPoint = PRISM_LEFT_SLOPE_PIVOT_POINT) {
		if ((pivotPrism < 0) || (pivotPrism >= this.pieceCount)) {
			console.error("Pivot prism index (" + pivotPrism
					+ ") out of range [0.." + this.pieceCount + ")");
			return [ ];
		}

		var pivotTransform = this.prismTransforms[pivotPrism];
		var orientation = pivotTransform.orientation.clone().inverse().premultiply(rotation).normalize();

		var pivotPosition = position.sub(pivotPoint.clone().applyQuaternion(rotation));

		var prisms = new Array(this.pieceCount);
		for (var i = 0; i < this.pieceCount; i++) {
			var transform = this.prismTransforms[i];

			var prism = new Prism(i);
			prism.position.copy(transform.position).sub(pivotTransform.position)
					.applyQuaternion(orientation).add(pivotPosition);
			prism.orientation.copy(transform.orientation).premultiply(orientation);
			if (materials.length > 0) {
				prism.material = materials[(invertMaterials) ? (this.pieceCount - i - 1) % materials.length
						: i % materials.length];
			}

			prism.head = (i == 0);
			prism.tail = (i == this.pieceCount - 1);

			if (i > 0) {
				var prevPrism = prisms[i - 1];
				prevPrism.nextPrism = prism;
				prism.prevPrism = prevPrism;
				if ((i == this.pieceCount - 1) && this.isClosed()) {
					var headPrism = prisms[0];
					prism.nextPrism = headPrism;
					headPrism.prevPrism = prism;
				}
			}

			prisms[i] = prism;
		}

		if (linkMidPrisms) {
			Shape.connectMidPrisms(prisms);
		}
		if (linkSidePrisms) {
			Shape.connectSidePrisms(prisms);
		}

		return prisms;
	}

	/**
	 * Merge shape prisms to trunk prisms at the base faces.
	 *
	 * @param trunkPrisms array of trunk prisms to which shape prisms merged.
	 * @param trunkPrism index of the trunk prism in range [0..trunkPrismCount).
	 * @param mergePrism index of the merge prism in range [0..pieceCount).
	 * @param turn additionally rotate 180 degrees around the face normal.
	 * @param materials cyclic materials of prisms.
	 * @param invertMaterials use materials in reverse or direct sequence.
	 * @param mergeFace face of the trunk prism to which merge.
	 * @param linkMidPrisms make connections between prism base faces.
	 * @param linkSidePrisms make connections between prism front and back triangles.
	 *
	 * @return array of final prisms.
	 */
	mergePrisms(trunkPrisms, trunkPrism, mergePrism, turn, materials, invertMaterials = false,
			mergeFace = SHAPE_MERGE_FACE_BOTTOM, linkMidPrisms = true, linkSidePrisms = true) {
		if ((trunkPrism < 0) || (trunkPrism >= trunkPrisms.length)) {
			console.error("Trunk prism index (" + trunkPrism + ") out of range [0.."
					+ trunkPrisms.length + ")");
			return [ ];
		}
		if ((mergePrism < 0) || (mergePrism >= this.pieceCount)) {
			console.error("Merge prism index (" + mergePrism + ") out of range [0.."
					+ this.pieceCount + ")");
			return [ ];
		}
		if (trunkPrisms.length == 0) {
			console.error("Trunk prism list should not be empty");
			return [ ];
		}

		var trunkPosition = trunkPrisms[trunkPrism].position;
		var trunkOrientation = trunkPrisms[trunkPrism].orientation;
		var mergeRotation;
		var mergePosition;
		switch (mergeFace) {
			case SHAPE_MERGE_FACE_BOTTOM:
				mergeRotation = new THREE.Quaternion().setFromAxisAngle((turn) ? new THREE.Vector3(0, 0, -1)
						: new THREE.Vector3(1, 0, 0), Math.PI).premultiply(trunkOrientation);
				mergePosition = PRISM_MERGE_BOTTOM_POSITION.clone()
						.applyQuaternion(trunkOrientation).add(trunkPosition);
				break;
			case SHAPE_MERGE_FACE_FRONT:
				mergeRotation = new THREE.Quaternion().setFromAxisAngle(
						new THREE.Vector3(0, 1, 0), (turn) ? Math.PI : 0).premultiply(trunkOrientation);
				mergePosition = PRISM_MERGE_FRONT_POSITION.clone()
						.applyQuaternion(trunkOrientation).add(trunkPosition);
				break;
			case SHAPE_MERGE_FACE_BACK:
				mergeRotation = new THREE.Quaternion().setFromAxisAngle(
						new THREE.Vector3(0, 1, 0), (turn) ? Math.PI : 0).premultiply(trunkOrientation);
				mergePosition = PRISM_MERGE_BACK_POSITION.clone()
						.applyQuaternion(trunkOrientation).add(trunkPosition);
				break;
			default:
				console.error("Unknown merge face " + mergeFace);
				return [ ];
		}

		var mergingPrisms = this.generatePrisms(mergePrism, mergePosition,
				mergeRotation, materials, invertMaterials, false, false, PRISM_MERGE_PIVOT_POINT);
		if (mergingPrisms.length == 0) {
			console.error("Merging prism list should not be empty");
			return [ ];
		}

		var prisms = new Array(trunkPrisms.length + mergingPrisms.length);
		for (var i = 0; i < trunkPrisms.length; i++) {
			prisms[i] = trunkPrisms[i];
		}
		for (var i = 0; i < mergingPrisms.length; i++) {
			var mergingPrism = mergingPrisms[i];
			mergingPrism.index = trunkPrisms.length + mergingPrism.index;
			prisms[trunkPrisms.length + i] = mergingPrism;
		}

		if (linkMidPrisms) {
			Shape.connectMidPrisms(prisms);
		}
		if (linkSidePrisms) {
			Shape.connectSidePrisms(prisms);
		}

		return prisms;
	}

	/**
	 * Create shape prisms by repetitive merging specified prisms.
	 *
	 * @param pivotPrism index of the pivot prism in range [0..pieceCount).
	 * @param position center position of the pivot prism.
	 * @param rotation bottom face rotation of the pivot prism.
	 * @param partCount number of parts merged by pattern.
	 * @param trunkPrism index of the trunk prism in range [0..pieceCount).
	 * @param mergePrism index of the merge prism in range [0..pieceCount).
	 * @param turn additionally rotate 180 degrees around the face normal.
	 * @param materials cyclic materials of prisms.
	 * @param invertTrunkMaterials use materials for trunk prisms in reverse or direct sequence.
	 * @param invertMergeMaterials use materials for merge prisms in reverse or direct sequence.
	 * @param mergeFace face of the trunk prism to which merge.
	 * @param linkMidPrisms make connections between prism base faces.
	 * @param linkSidePrisms make connections between prism front and back triangles.
	 * @param pivotPoint point on the pivot prism which will be moved to the specified position.
	 *
	 * @return array of generated prisms.
	 */
	generatePatternPrisms(pivotPrism, position, rotation, partCount,
			trunkPrism, mergePrism, turn, materials, invertTrunkMaterials = false,
			invertMergeMaterials = false, mergeFace = SHAPE_MERGE_FACE_BOTTOM, linkMidPrisms = true,
			linkSidePrisms = true, pivotPoint = PRISM_LEFT_SLOPE_PIVOT_POINT) {
		if (partCount < 2) {
			console.error("Number of parts (" + partCount + ") must be greater or equal to 2");
			return [ ];
		}

		var prisms = this.generatePrisms(pivotPrism, position, rotation,
				materials, invertTrunkMaterials, false, false, pivotPoint);
		if (prisms.length == 0) {
			console.error("Base prism list should not be empty");
			return [ ];
		}

		for (var i = 0; i < partCount - 1; i++) {
			prisms = this.mergePrisms(prisms, trunkPrism + i * this.pieceCount, mergePrism,
					turn, materials, invertMergeMaterials, mergeFace, false, false);
			if (prisms.length == 0) {
				console.error("Merged prism list should not be empty");
				return [ ];
			}
		}

		if (linkMidPrisms) {
			Shape.connectMidPrisms(prisms);
		}
		if (linkSidePrisms) {
			Shape.connectSidePrisms(prisms);
		}

		return prisms;
	}

	/**
	 * Create prisms using formation and materials.
	 *
	 * @param prismFormation prisms generation data.
	 * @param materials cyclic materials of prisms.
	 * @param invertTrunkMaterials use materials for trunk prisms in reverse or direct sequence.
	 * @param invertMergeMaterials use materials for merge prisms in reverse or direct sequence.
	 *
	 * @return array of generated prisms.
	 */
	static buildPrisms(prismFormation, materials, invertTrunkMaterials = false, invertMergeMaterials = false) {
		var shape = new Shape(prismFormation.pieceCount, prismFormation.notation);
		if (prismFormation.partCount > 1) {
			return shape.generatePatternPrisms(prismFormation.pivotPrism,
					prismFormation.position, prismFormation.rotation, prismFormation.partCount,
					prismFormation.trunkPrism, prismFormation.mergePrism, prismFormation.turn,
					materials, invertTrunkMaterials, invertMergeMaterials, prismFormation.mergeFace);
		} else {
			return shape.generatePrisms(prismFormation.pivotPrism,
					prismFormation.position, prismFormation.rotation, materials);
		}
	}

	/**
	 * Determine contacts of prism base faces and set prism double links.
	 */
	static connectMidPrisms(prisms) {
		var prismMidFaces = new Array(prisms.length);
		for (var i = 0; i < prisms.length; i++) {
			var prism = prisms[i];
			var position = prism.position;
			var orientation = prism.orientation;
			prismMidFaces[i] = [
					PRISM_VERTICES[0].clone().applyQuaternion(orientation).add(position),
					PRISM_VERTICES[1].clone().applyQuaternion(orientation).add(position),
					PRISM_VERTICES[4].clone().applyQuaternion(orientation).add(position),
					PRISM_VERTICES[5].clone().applyQuaternion(orientation).add(position) ];
			prism.midPrism = null;
		}

		for (var i = 0; i < prisms.length; i++) {
			var vertices = prismMidFaces[i];
			for (var j = i + 1; j < prisms.length; j++) {
				var otherVertices = prismMidFaces[j];

				if (((vertices[0].distanceToSquared(otherVertices[2])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS)
						&& (vertices[1].distanceToSquared(otherVertices[3])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS)
						&& (vertices[2].distanceToSquared(otherVertices[0])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS)
						&& (vertices[3].distanceToSquared(otherVertices[1])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS))
						||
						((vertices[0].distanceToSquared(otherVertices[1])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS)
						&& (vertices[1].distanceToSquared(otherVertices[0])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS)
						&& (vertices[2].distanceToSquared(otherVertices[3])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS)
						&& (vertices[3].distanceToSquared(otherVertices[2])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS))) {
					prisms[i].midPrism = prisms[j];
					prisms[j].midPrism = prisms[i];
				}
			}
		}
	}

	/**
	 * Determine contacts of prism front and back triangles and set prism double links.
	 */
	static connectSidePrisms(prisms) {
		var prismFrontTriangles = new Array(prisms.length);
		var prismBackTriangles = new Array(prisms.length);
		for (var i = 0; i < prisms.length; i++) {
			var prism = prisms[i];
			var position = prism.position;
			var orientation = prism.orientation;
			prismFrontTriangles[i] = [
					PRISM_VERTICES[5].clone().applyQuaternion(orientation).add(position),
					PRISM_VERTICES[3].clone().applyQuaternion(orientation).add(position),
					PRISM_VERTICES[1].clone().applyQuaternion(orientation).add(position) ];
			prismBackTriangles[i] = [
					PRISM_VERTICES[0].clone().applyQuaternion(orientation).add(position),
					PRISM_VERTICES[2].clone().applyQuaternion(orientation).add(position),
					PRISM_VERTICES[4].clone().applyQuaternion(orientation).add(position) ];
			prism.frontPrism = null;
			prism.backPrism = null;
		}

		for (var i = 0; i < prisms.length; i++) {
			var frontTriangle = prismFrontTriangles[i];
			var backTriangle = prismBackTriangles[i];
			for (var j = i + 1; j < prisms.length; j++) {
				var otherFrontTriangle = prismFrontTriangles[j];
				var otherBackTriangle = prismBackTriangles[j];

				if ((frontTriangle[0].distanceToSquared(otherBackTriangle[2])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS)
						&& (frontTriangle[1].distanceToSquared(otherBackTriangle[1])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS)
						&& (frontTriangle[2].distanceToSquared(otherBackTriangle[0])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS)) {
					prisms[i].frontPrism = prisms[j];
					prisms[j].backPrism = prisms[i];
				} else if ((backTriangle[0].distanceToSquared(otherFrontTriangle[2])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS)
						&& (backTriangle[1].distanceToSquared(otherFrontTriangle[1])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS)
						&& (backTriangle[2].distanceToSquared(otherFrontTriangle[0])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS)) {
					prisms[i].backPrism = prisms[j];
					prisms[j].frontPrism = prisms[i];
				} else if ((frontTriangle[0].distanceToSquared(otherFrontTriangle[2])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS)
						&& (frontTriangle[1].distanceToSquared(otherFrontTriangle[1])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS)
						&& (frontTriangle[2].distanceToSquared(otherFrontTriangle[0])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS)) {
					prisms[i].frontPrism = prisms[j];
					prisms[j].frontPrism = prisms[i];
				} else if ((backTriangle[0].distanceToSquared(otherBackTriangle[2])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS)
						&& (backTriangle[1].distanceToSquared(otherBackTriangle[1])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS)
						&& (backTriangle[2].distanceToSquared(otherBackTriangle[0])
						< PRISM_SAME_VERTICE_SQUARED_DISTANCE_EPS)) {
					prisms[i].backPrism = prisms[j];
					prisms[j].backPrism = prisms[i];
				}
			}
		}
	}
}

export class PrismView extends THREE.Mesh {
	constructor(prism, geometry) {
		super(geometry, (prism.material !== null) ? prism.material
				: new THREE.MeshBasicMaterial({ color: 0x000000}));
		this.prism = prism;

		this.position.copy(prism.position);
		this.quaternion.copy(prism.orientation);
	}
}

export class ShapeView extends THREE.Group {
	constructor(prisms, geometry) {
		super();
		this.prisms = prisms;
		this.origin = Prism.computeOrigin(prisms);

		for (var i = 0; i < prisms.length; i++) {
			var prism = prisms[i];
			var material = (prism.material !== null) ? prism.material
					: new THREE.MeshBasicMaterial({ color: 0x000000});
			var mesh = new THREE.Mesh(geometry, material);
			mesh.position.copy(prism.position).sub(this.origin);
			mesh.quaternion.copy(prism.orientation);
			mesh.matrixAutoUpdate = false;
			mesh.updateMatrix();
			this.add(mesh);
		}
		this.position.copy(this.origin);
	}

	computeAABB() {
		return Prism.computeParentOverallAABB(this.prisms,
				this.origin, this.position, this.quaternion);
	}
}

export class Scene extends THREE.Scene {
	constructor() {
		super();
		this.prismGeometry = null;
		this.prismViews = [ ];
		this.shapeViews = [ ];
		this.prismRigids = [ ];
		this.shapeRigids = [ ];
		this.shapeImmovables = [ ];

		this.collisionConfiguration = null;
		this.dispatcher = null;
		this.overlappingPairCache = null;
		this.solver = null;
		this.dynamicsWorld = null;
		this.prismShape = null;
		this.prismInertia = null;
		this.transformAux = null;
		this.fixedBody = null;
	}

	setPrismGeometry(prismGeometry) {
		this.prismGeometry = prismGeometry;
	}

	createPrismView(prism) {
		if (!this.prismGeometry) {
			throw new Error("Prism geometry not set");
		}

		var prismView = new PrismView(prism, this.prismGeometry);
		this.prismViews.push(prismView);
		this.add(prismView);
		return prismView;
	}

	destroyPrismView(prismView) {
		var idx = this.prismViews.indexOf(prismView);
		if (idx != -1) {
			this.prismViews.splice(idx, 1);
			this.remove(prismView);
		}
	}

	createPrismViews(prisms) {
		var prismViews = new Array(prisms.length);
		for (var i = 0; i < prisms.length; i++) {
			var prismView = this.createPrismView(prisms[i]);
			prismViews[i] = prismView;
		}
		return prismViews;
	}

	destroyPrismViews(prismViews) {
		for (prismView of prismViews) {
			this.destroyPrismView(prismView);
		}
	}

	createShapeView(prisms) {
		if (!this.prismGeometry) {
			throw new Error("Prism geometry not set");
		}

		var shapeView = new ShapeView(prisms, this.prismGeometry);
		this.shapeViews.push(shapeView);
		this.add(shapeView);
		return shapeView;
	}

	destroyShapeView(shapeView) {
		var idx = this.shapeViews.indexOf(shapeView);
		if (idx != -1) {
			this.shapeViews.splice(idx, 1);
			this.remove(shapeView);
		}
	}

	initPhysics() {
		Ammo().then((Ammo) => {
			this.collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
			this.dispatcher = new Ammo.btCollisionDispatcher(this.collisionConfiguration);
			this.overlappingPairCache = new Ammo.btDbvtBroadphase();
			this.solver = new Ammo.btSequentialImpulseConstraintSolver();
			this.dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(this.dispatcher,
					this.overlappingPairCache, this.solver, this.collisionConfiguration);
			this.transformAux = new Ammo.btTransform();
		});
	}

	validatePhysics() {
		if (!this.dynamicsWorld) {
			throw new Error("Physics not initialized");
		}
	}

	setGravity(gx, gy, gz) {
		this.validatePhysics();

		this.dynamicsWorld.setGravity(new Ammo.btVector3(gx, gy, gz));
	}

	updatePhysics(dt, maxSubSteps = DEFAULT_PHYSICS_MAX_SUB_STEPS,
			fixedTimeStep = DEFAULT_PHYSICS_FIXED_TIME_STEP) {
		this.validatePhysics();

		this.dynamicsWorld.stepSimulation(dt, maxSubSteps, fixedTimeStep);

		for (var prismRigid of this.prismRigids) {
			this.syncViewToBody(prismRigid.body, prismRigid.view);
		}
		for (var shapeRigid of this.shapeRigids) {
			this.syncViewToBody(shapeRigid.body, shapeRigid.view);
		}
	}

	preparePrismShape() {
		if (this.prismShape == null) {
			this.prismShape = new Ammo.btConvexHullShape();
			this.prismShape.setMargin(PRISM_SHAPE_MARGIN);
			for (var i = 0; i < PRISM_VERTICES.length; i++) {
				var v = PRISM_VERTICES[i];
				var recalculateLocalAabb = (i == PRISM_VERTICES.length - 1);
				this.prismShape.addPoint(new Ammo.btVector3(v.x, v.y, v.z), recalculateLocalAabb);
			}
			this.prismInertia = new Ammo.btVector3(0, 0, 0);
			// XXX calculate precise local inertia of prism shape
			this.prismShape.calculateLocalInertia(PRISM_MASS, this.prismInertia);
		}
	}

	createCollisionShape(prisms) {
		this.validatePhysics();

		this.preparePrismShape();

		var origin = Prism.computeOrigin(prisms);
		var collisionShape = new Ammo.btCompoundShape();
		for (var prism of prisms) {
			var prismTransform = new Ammo.btTransform();
			prismTransform.setOrigin(new Ammo.btVector3(prism.position.x - origin.x,
					prism.position.y - origin.y, prism.position.z - origin.z));
			prismTransform.setRotation(new Ammo.btQuaternion(prism.orientation.x,
					prism.orientation.y, prism.orientation.z, prism.orientation.w));
			collisionShape.addChildShape(prismTransform, this.prismShape);
		}
		return collisionShape;
	}

	createRigidBody(totalMass, collisionShape, localInertia, position, orientation) {
		this.validatePhysics();

		var transform = new Ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
		transform.setRotation(new Ammo.btQuaternion(orientation.x, orientation.y,
				orientation.z, orientation.w));
		var motionState = new Ammo.btDefaultMotionState(transform);
		var rigidInfo = new Ammo.btRigidBodyConstructionInfo(totalMass,
				motionState, collisionShape, localInertia);
		var rigidBody = new Ammo.btRigidBody(rigidInfo);
		rigidBody.setActivationState(4); // disable deactivation
		this.dynamicsWorld.addRigidBody(rigidBody);
		return rigidBody;
	}

	destroyRigidBody(rigidBody) {
		this.validatePhysics();

		this.dynamicsWorld.removeRigidBody(rigidBody);
	}

	createKinematicBody(collisionShape, position, orientation) {
		this.validatePhysics();

		var kinematicBody = this.createRigidBody(0, collisionShape,
				new Ammo.btVector3(0, 0, 0), position, orientation);
		kinematicBody.setCollisionFlags(kinematicBody.getCollisionFlags() | 2); // CF_KINEMATIC_OBJECT
		return kinematicBody;
	}

	destroyKinematicBody(kinematicBody) {
		this.destroyRigidBody(kinematicBody);
	}

	createPrismRigid(prism) {
		this.validatePhysics();

		var prismView = this.createPrismView(prism);

		this.preparePrismShape();

		var rigidBody = this.createRigidBody(PRISM_MASS, this.prismShape,
				this.prismInertia, prism.position, prism.orientation);

		var prismRigid = {
			view: prismView,
			body: rigidBody
		};
		this.prismRigids.push(prismRigid);
		return prismRigid;
	}

	destroyPrismRigid(prismRigid) {
		var idx = this.prismRigids.indexOf(prismRigid);
		if (idx != -1) {
			this.prismRigids.splice(idx, 1);
			this.destroyPrismView(prismRigid.view);
			this.destroyRigidBody(prismRigid.body);
		}
	}

	createPrismRigids(prisms) {
		var prismRigids = new Array(prisms.length);
		for (var i = 0; i < prisms.length; i++) {
			var prismRigid = this.createPrismRigid(prisms[i]);
			prismRigids[i] = prismRigid;
		}
		return prismRigids;
	}

	destroyPrismRigids(prismRigids) {
		for (prismRigid of prismRigids) {
			this.destroyPrismRigid(prismRigid);
		}
	}

	createShapeRigid(prisms, position, orientation) {
		this.validatePhysics();

		var shapeView = this.createShapeView(prisms);
		shapeView.position.copy(position);
		shapeView.quaternion.copy(orientation);

		var totalMass = prisms.length * PRISM_MASS;
		var collisionShape = this.createCollisionShape(prisms);
		var localInertia = new Ammo.btVector3(0, 0, 0);
		// XXX calculate precise local inertia of compound shape
		collisionShape.calculateLocalInertia(totalMass, localInertia);

		var rigidBody = this.createRigidBody(totalMass, collisionShape,
				localInertia, position, orientation);

		var shapeRigid = {
			view: shapeView,
			body: rigidBody
		};
		this.shapeRigids.push(shapeRigid);
		return shapeRigid;
	}

	destroyShapeRigid(shapeRigid) {
		var idx = this.shapeRigids.indexOf(shapeRigid);
		if (idx != -1) {
			this.shapeRigids.splice(idx, 1);
			this.destroyShapeView(shapeRigid.view);
			this.destroyRigidBody(shapeRigid.body);
		}
	}

	createShapeImmovable(prisms) {
		this.validatePhysics();

		var shapeView = this.createShapeView(prisms);
		var origin = shapeView.origin;

		var totalMass = 0;
		var collisionShape = this.createCollisionShape(prisms);
		var localInertia = new Ammo.btVector3(0, 0, 0);

		var rigidBody = this.createRigidBody(totalMass, collisionShape,
				localInertia, origin, new THREE.Quaternion());

		var shapeImmovable = {
			view: shapeView,
			body: rigidBody
		};
		this.shapeImmovables.push(shapeImmovable);
		return shapeImmovable;
	}

	destroyShapeImmovable(shapeImmovable) {
		var idx = this.shapeImmovables.indexOf(shapeImmovable);
		if (idx != -1) {
			this.shapeImmovables.splice(idx, 1);
			this.destroyShapeView(shapeImmovable.view);
			this.destroyRigidBody(shapeImmovable.body);
		}
	}

	createShapeKinematic(prisms) {
		this.validatePhysics();

		// TODO createShapeKinematic
	}

	destroyShapeKinematic(shapeKinematic) {
		// TODO destroyShapeKinematic
	}

	getFixedBody() {
		if (this.fixedBody == null) {
			this.fixedBody = new Ammo.btRigidBody(new Ammo.btRigidBodyConstructionInfo(0, null, null));
		}
		return this.fixedBody;
	}

	createGeneric6DofConstraint(body1, position1 = null, orientation1 = null, body2 = null,
			position2 = null, orientation2 = null, useLinearReferenceFrameA = true) {
		this.validatePhysics();

		var frameInA = new Ammo.btTransform();
		frameInA.setIdentity();
		if (position1) {
			frameInA.setOrigin(new Ammo.btVector3(position1.x, position1.y, position1.z));
		}
		if (orientation1) {
			frameInA.setRotation(new Ammo.btQuaternion(orientation1.x, orientation1.y,
					orientation1.z, orientation1.w));
		}
		var frameInB = new Ammo.btTransform();
		frameInB.setIdentity();
		if (position2) {
			frameInB.setOrigin(new Ammo.btVector3(position2.x, position2.y, position2.z));
		}
		if (orientation2) {
			frameInB.setRotation(new Ammo.btQuaternion(orientation2.x, orientation2.y,
					orientation2.z, orientation2.w));
		}
		var constraint = new Ammo.btGeneric6DofConstraint(
				body1, (body2) ? body2 : this.getFixedBody(),
				frameInA, frameInB, useLinearReferenceFrameA);
		this.dynamicsWorld.addConstraint(constraint);
		return constraint;
	}

	setLinearConstraintLimits(constraint, linearLowerX, linearUpperX,
			linearLowerY, linearUpperY, linearLowerZ, linearUpperZ) {
		this.validatePhysics();

		constraint.setLinearLowerLimit(new Ammo.btVector3(linearLowerX, linearLowerY, linearLowerZ));
		constraint.setLinearUpperLimit(new Ammo.btVector3(linearUpperX, linearUpperY, linearUpperZ));
	}

	setAngularConstraintLimits(constraint, angularLowerX, angularUpperX,
			angularLowerY, angularUpperY, angularLowerZ, angularUpperZ) {
		this.validatePhysics();

		constraint.setAngularLowerLimit(new Ammo.btVector3(angularLowerX, angularLowerY, angularLowerZ));
		constraint.setAngularUpperLimit(new Ammo.btVector3(angularUpperX, angularUpperY, angularUpperZ));
	}

	applyBodyCentralForce(body, force) {
		this.validatePhysics();

		body.applyCentralForce(new Ammo.btVector3(force.x, force.y, force.z));
	}

	syncViewToBody(body, view) {
		var motionState = body.getMotionState();
		if (motionState) {
			motionState.getWorldTransform(this.transformAux);
			var p = this.transformAux.getOrigin();
			var q = this.transformAux.getRotation();
			view.position.set(p.x(), p.y(), p.z());
			view.quaternion.set(q.x(), q.y(), q.z(), q.w());
		}
	}
}
