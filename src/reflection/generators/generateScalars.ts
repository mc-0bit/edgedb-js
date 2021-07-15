import {genutil} from "../util/genutil";
import type {GeneratorParams} from "../generate";

export const generateScalars = async (params: GeneratorParams) => {
  const {dir, types, casts, scalars} = params;
  for (const type of types.values()) {
    if (type.kind !== "scalar") {
      continue;
    }

    const {mod, name: _name} = genutil.splitName(type.name);
    // const name = `$${_name}`;
    const displayName = genutil.displayName(type.name);
    const literalConstructor = _name.toLowerCase();

    const sc = dir.getPath(`modules/${mod}.ts`);

    const scopeName = genutil.getScopedDisplayName(mod, sc);

    if (type.name === "std::anyenum") {
      sc.writeln(`
const ANYENUM_SYMBOL: unique symbol = Symbol("std::anyenum");
export interface $Anyenum<
  TsType = unknown,
  Name extends string = string,
  Values extends [string, ...string[]] = [string, ...string[]]
> extends $.ScalarType<Name, TsType> {
  [ANYENUM_SYMBOL]: true;
  __values__: Values;
}`);
      sc.nl();
      continue;
    }

    if (type.is_abstract) {
      const scalarType = scalars.get(type.id);

      if (scalarType.children.length) {
        // is abstract
        const scopedNames = scalarType.children.map((desc) =>
          scopeName(desc.name)
        );
        sc.writeln(`export type ${displayName} = ${scopedNames.join(" | ")};`);
        sc.writeln(
          `export const ${displayName} = $.makeType<${displayName}>(__spec__, "${type.id}");`
        );
        sc.nl();
      } else if (scalarType.bases.length) {
        // for std::sequence
        const bases = scalarType.bases.map((base) => scopeName(base.name));
        sc.writeln(
          `export interface ${displayName} extends ${bases.join(", ")} {}`
        );
        sc.writeln(
          `export const ${displayName} = $.makeType<${displayName}>(__spec__, "${type.id}");`
        );
        sc.nl();
      }

      continue;
    }

    sc.addImport(`import {reflection as $} from "edgedb";`);
    sc.addImport(`import {spec as __spec__} from "../__spec__";`);

    // generate enum
    if (type.enum_values && type.enum_values.length) {
      sc.writeln(`export enum ${displayName}Enum {`);
      sc.indented(() => {
        for (const val of type.enum_values) {
          sc.writeln(`${genutil.toIdent(val)} = ${genutil.quote(val)},`);
        }
      });
      sc.writeln(`}`);

      const valuesArr = `[${type.enum_values
        .map((v) => `"${v}"`)
        .join(", ")}]`;
      sc.writeln(
        `export type ${displayName} = typeof ${displayName}Enum & ${scopeName(
          "std::anyenum"
        )}<${displayName}Enum, "${type.name}", ${valuesArr}>;`
      );
      sc.writeln(
        `export const ${displayName}: ${displayName} = {...${displayName}Enum, __values__: ${valuesArr}} as any;`
      );

      sc.nl();
      continue;
    }

    // generate non-enum non-abstract scalar
    sc.addImport(`import * as syntax from "../syntax/syntax";`);

    const tsType = genutil.toTSScalarType(type, types, mod, sc);
    sc.writeln(
      `export type ${displayName} = $.ScalarType<"${type.name}", ${tsType}>;`
    );
    sc.writeln(
      `export const ${displayName} = $.makeType<${displayName}>(__spec__, "${type.id}");`
    );
    // make string literals literal
    if (type.name === "std::str") {
      sc.writeln(
        `export const str = <T extends string>(val: T) => syntax.literal<$.ScalarType<"std::str", T>>($Str as any, val);`
      );
    } else {
      sc.writeln(
        `export const ${literalConstructor} = (val:${tsType})=>syntax.literal(${displayName}, val);`
      );
    }
    // sc.writeln(`export const ${displayName}: ${displayName} = {`);
    // sc.writeln(`  __name__: "${type.name}",`);
    // sc.writeln(`} as any;`);

    sc.nl();
  }
};
