import {
  LinkDesc,
  PropertyDesc,
  MaterialType,
  ObjectTypeSet,
  TypeSet,
  Expression,
  ObjectTypeShape,
} from "./typesystem";
import {Cardinality, ExpressionKind} from "./enums";
import {cardinalityUtil} from "./util/cardinalityUtil";

// get the set representing the result of a path traversal
// including cardinality merging
type getChildOfObjectTypeSet<
  Root extends ObjectTypeSet,
  ChildKey extends keyof Root["__element__"]["__pointers__"]
> = TypeSet<
  Root["__element__"]["__pointers__"][ChildKey]["target"],
  cardinalityUtil.multiplyCardinalities<
    Root["__cardinality__"],
    Root["__element__"]["__pointers__"][ChildKey]["cardinality"]
  >
>;

// path parent must be object expression
export interface PathParent<Parent extends ObjectTypeSet = ObjectTypeSet> {
  type: Parent;
  linkName: string;
}

// type t1 = assert_singleλFuncExpr<
//   $expr_PathNode<ObjectTypeSet, PathParent | null, boolean>
// >;
// type t2 = assert_singleλFuncExpr<
//   Expression<ObjectTypeSet<SomeObjectType, Cardinality>>
// >;

// const arg = (arg1: t1) => {
//   return arg1;
// };
// arg("dsf" as t2);

export type $pathify<
  Root extends TypeSet,
  Parent extends PathParent | null = null
> = Root extends ObjectTypeSet
  ? ObjectTypeSet extends Root
    ? {} // Root is literally ObjectTypeSet
    : ObjectTypeShape extends Root["__element__"]["__pointers__"]
    ? {}
    : {
        // & string required to avod typeError on linkName
        [k in keyof Root["__element__"]["__pointers__"] &
          string]: Root["__element__"]["__pointers__"][k] extends PropertyDesc
          ? $expr_PathLeaf<
              getChildOfObjectTypeSet<Root, k>,
              {type: $expr_PathNode<Root, Parent>; linkName: k},
              Root["__element__"]["__pointers__"][k]["exclusive"]
            >
          : Root["__element__"]["__pointers__"][k] extends LinkDesc
          ? getChildOfObjectTypeSet<Root, k> extends ObjectTypeSet
            ? $expr_PathNode<
                getChildOfObjectTypeSet<Root, k>,
                {type: $expr_PathNode<Root, Parent>; linkName: k},
                Root["__element__"]["__pointers__"][k]["exclusive"]
              >
            : never
          : never;
      } &
        PathNodeMethods<Root>
  : unknown; // pathify does nothing on non-object types

export type $expr_PathNode<
  Root extends ObjectTypeSet = ObjectTypeSet,
  Parent extends PathParent | null = PathParent | null,
  Exclusive extends boolean = boolean
> = Expression<{
  __element__: Root["__element__"];
  __cardinality__: Root["__cardinality__"];
  __parent__: Parent;
  __kind__: ExpressionKind.PathNode;
  __exclusive__: Exclusive;
}>;

interface PathNodeMethods<Self extends ObjectTypeSet> {
  __element__: Self["__element__"];
  __cardinality__: Self["__cardinality__"];
}

export type $expr_TypeIntersection<
  Expr extends TypeSet = TypeSet,
  Intersection extends ObjectTypeSet = ObjectTypeSet
> = Expression<{
  __element__: Intersection["__element__"];
  __cardinality__: Expr["__cardinality__"];
  __kind__: ExpressionKind.TypeIntersection;
  __expr__: Expr;
}>;

export type $expr_PathLeaf<
  Root extends TypeSet = TypeSet,
  Parent extends PathParent = PathParent,
  Exclusive extends boolean = boolean
> = Expression<{
  __element__: Root["__element__"];
  __cardinality__: Root["__cardinality__"];
  __kind__: ExpressionKind.PathLeaf;
  __parent__: Parent;
  __exclusive__: Exclusive;
}>;

export type ExpressionRoot = {
  __element__: MaterialType;
  __cardinality__: Cardinality;
  __kind__: ExpressionKind;
};