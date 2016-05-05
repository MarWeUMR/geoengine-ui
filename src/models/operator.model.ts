import Config from "../config.model";
import {Projection, Projections} from "./projection.model";
import {Unit, UnitDict} from "./unit.model";
import {DataType, DataTypes} from "./datatype.model";
import {OperatorType, OperatorTypeDict, OperatorTypeMappingDict, ProjectionType}
        from "./operator-type.model";
import {ResultType, ResultTypes} from "./result-type.model";

type OperatorId = number;
type AttributeName = string;

interface OperatorConfig {
    operatorType: OperatorType;
    resultType: ResultType;
    projection: Projection;
    attributes: Array<AttributeName>;
    dataTypes: Map<AttributeName, DataType>;
    units: Map<AttributeName, Unit>;
    rasterSources?: Array<Operator>;
    pointSources?: Array<Operator>;
    lineSources?: Array<Operator>;
    polygonSources?: Array<Operator>;
}

/**
 * Serialization interface
 */
export interface OperatorDict {
    id: number;
    operatorType: OperatorTypeDict;
    resultType: string;
    projection: string;
    attributes: Array<string>;
    dataTypes: Array<[string, string]>;
    units: Array<[string, UnitDict]>;
    rasterSources: Array<OperatorDict>;
    pointSources: Array<OperatorDict>;
    lineSources: Array<OperatorDict>;
    polygonSources: Array<OperatorDict>;
}

interface QueryDict {
    type: string;
    params: OperatorTypeMappingDict;
    sources?: {
        raster?: Array<QueryDict>;
        points?: Array<QueryDict>;
        lines?: Array<QueryDict>;
        polygons?: Array<QueryDict>;
    };
}

/**
 * An operator represents a query graph consisting of source operators.
 * It has several metadata fields for e.g. parameters and projection.
 */
export class Operator {
    private _id: OperatorId;

    private _resultType: ResultType;
    private _operatorType: OperatorType;

    private _attributes: Array<AttributeName>;
    private _dataTypes: Map<AttributeName, DataType>;
    private _units: Map<AttributeName, Unit>;

    private _projection: Projection;

    private rasterSources: Operator[] = [];
    private pointSources: Operator[] = [];
    private lineSources: Operator[] = [];
    private polygonSources: Operator[] = [];

    private static _operatorId = 1;

    /**
     * Instantiate an operator.
     *
     * @param config.operatorType      The mapping type name of the operator.
     * @param config.resultType        A {@link resultType}.
     * @param config.projection        A {@link Projection}.
     * @param config.displayName       The user-given name of this operator instance.
     * @param config.rasterSources     A list of operators with {@link resultType} `RASTER`.
     * @param config.pointSources      A list of operators with {@link resultType} `POINTS`.
     * @param config.lineSources       A list of operators with {@link resultType} `LINES`.
     * @param config.polygonSources    A list of operators with {@link resultType} `POLYGONS`.
     *
     */
    constructor(config: OperatorConfig) {
        this._id = Operator.nextOperatorId;

        this._operatorType = config.operatorType,
        this._resultType = config.resultType;

        this._projection = config.projection;

        this._attributes = config.attributes;
        this._dataTypes = config.dataTypes;
        this._units = config.units;

        if (config.rasterSources === undefined) {
            config.rasterSources = [];
        }
        if (config.pointSources === undefined) {
            config.pointSources = [];
        }
        if (config.lineSources === undefined) {
            config.lineSources = [];
        }
        if (config.polygonSources === undefined) {
            config.polygonSources = [];
        }

        let sources: Array<[Operator[], Operator[], ResultType]> = [
            [config.rasterSources, this.rasterSources, ResultTypes.RASTER],
            [config.pointSources, this.pointSources, ResultTypes.POINTS],
            [config.lineSources, this.lineSources, ResultTypes.LINES],
            [config.polygonSources, this.polygonSources, ResultTypes.POLYGONS]
        ];

        for (let [source, sink, sinkType] of sources) {
            for (let operator of source) {
                if (operator.resultType === sinkType) {
                    sink.push(operator);
                } else {
                    throw Error("The Operator in array rasterSources is not of type RASTER.");
                }
            }
        }

    }

    /**
     * Retrieve a new unique id.
     * @return operator id
     */
    private static get nextOperatorId(): OperatorId {
        return this._operatorId++;
    }

    /**
     * Unique id of this operator instance.
     */
    get id(): OperatorId {
        return this._id;
    }

    /**
     * The type of the operator.
     */
    get operatorType(): OperatorType {
        return this._operatorType;
    }

    /**
     * Retrieve the output result type.
     */
    get resultType(): ResultType {
        return this._resultType;
    }

    /**
     * Retrieve the output projection.
     */
    get projection(): Projection {
        return this._projection;
    }

    /**
     * Retrieve the output attributes.
     */
    get attributes(): Array<AttributeName> {
        return this._attributes;
    }

    /**
     * Retrieve the attribute data type.
     */
    getDataType(attribute: AttributeName): DataType {
        return this._dataTypes.get(attribute);
    }

    /**
     * Retrieve all data types.
     */
    get dataTypes(): Map<AttributeName, DataType> {
        return this._dataTypes;
    }

    /**
     * Retrieve the attribute unit.
     */
    getUnit(attribute: AttributeName): Unit {
        return this._units.get(attribute);
    }

    /**
     * Retrieve all units.
     */
    get units(): Map<AttributeName, Unit> {
        return this._units;
    }

    /**
     * The total amount of sources.
     */
    get sourceCount(): number {
        return this.rasterSources.length + this.pointSources.length
                + this.lineSources.length + this.polygonSources.length;
    }

    /**
     * Retrieve a source by id.
     *
     * @param id The id of the source operator.
     */
    getAnySource(id: number) {
        for (let source of this.rasterSources) {
            if (source.id === id) {
                return source;
            }
        }

        throw Error(`getAnySource: no source found with id ${id} in ${JSON.stringify(this)}`);
    }

    /**
     * Does the operator has sources or it it a **source operator**?
     */
    hasSources(): boolean {
        return this.rasterSources.length > 0 || this.pointSources.length > 0
               || this.lineSources.length > 0 || this.polygonSources.length > 0;
    }

    /**
     * Retrieve the sources by type.
     *
     * @param sourceType The {@link resultType} of the source.
     */
    getSources(sourceType: ResultType): Operator[] {
        switch (sourceType) {
            case ResultTypes.RASTER:
                return this.rasterSources;
            case ResultTypes.POINTS:
                return this.pointSources;
            case ResultTypes.LINES:
                return this.lineSources;
            case ResultTypes.POLYGONS:
                return this.polygonSources;
            default:
                throw Error("Invalid Source Type");
        }
    }

    /**
     * Return the operator with an optional projection operator to
     * comply with the desired {@link Projection}.
     *
     * @param projection The desired output projection.
     */
    getProjectedOperator(projection: Projection): Operator {
        if (projection === this.projection) {
            return this;
        } else {
            return new Operator({
                operatorType: new ProjectionType({
                    srcProjection: this.projection,
                    destProjection: projection,
                }),
                resultType: this.resultType,
                projection: projection,
                attributes: this._attributes,
                dataTypes: this._dataTypes,
                units: this._units,
                rasterSources: this.resultType === ResultTypes.RASTER ? [this] : [],
                pointSources: this.resultType === ResultTypes.POINTS ? [this] : [],
                lineSources: this.resultType === ResultTypes.LINES ? [this] : [],
                polygonSources: this.resultType === ResultTypes.POLYGONS ? [this] : [],
            });
        }
    }

    /**
     * Dictionary reprensentation of the operator as query parameter.
     */
    private toQueryDict(): QueryDict {
        let dict: QueryDict = {
            type: this._operatorType.getMappingName(),
            params: this._operatorType.toMappingDict(),
        };

        if (this.hasSources()) {
            let sources: any = {};

            let sourcesList: Array<[string, Array<Operator>]> = [
                [ResultTypes.RASTER.getCode(), this.rasterSources],
                [ResultTypes.POINTS.getCode(), this.pointSources],
                [ResultTypes.LINES.getCode(), this.lineSources],
                [ResultTypes.POLYGONS.getCode(), this.polygonSources]
            ];
            for (let [sourceString, source] of sourcesList) {
                if (source.length > 0) {
                    sources[sourceString] = [];
                    for (let operator of source) {
                        sources[sourceString].push(operator.toQueryDict());
                    }
                }
            }

            dict["sources"] = sources;
        }

        return dict;
    }

    /**
     * String representation of the operator as query parameter in JSON format.
     */
    toQueryJSON(): string {
        return JSON.stringify(this.toQueryDict());
    }

    toDict(): OperatorDict {
      let dict: OperatorDict = {
        id: this._id,
        resultType: this._resultType.getCode(),
        operatorType: this._operatorType.toDict(),
        projection: this._projection.getCode(),
        attributes: this._attributes,
        dataTypes: <Array<[AttributeName, string]>> Array.from(this._dataTypes.entries()).map(
            ([name, datatype]) => [name, datatype.getCode()]
        ),
        units: <Array<[AttributeName, UnitDict]>> Array.from(this._units.entries()).map(
            ([name, unit]) => [name, unit.toDict()]
        ),
        rasterSources: this.rasterSources.map(operator => operator.toDict()),
        pointSources: this.pointSources.map(operator => operator.toDict()),
        lineSources: this.lineSources.map(operator => operator.toDict()),
        polygonSources: this.polygonSources.map(operator => operator.toDict()),
      };

      return dict;
    }

    toJSON(): string {
      return JSON.stringify(this.toDict());
    }

    static fromJSON(json: string): Operator {
      return this.fromDict(JSON.parse(json));
    }

    static fromDict(operatorDict: OperatorDict): Operator {
        let operator = new Operator({
            operatorType: OperatorType.fromDict(operatorDict.operatorType),
            resultType: ResultTypes.fromCode(operatorDict.resultType),
            projection: Projections.fromCode(operatorDict.projection),
            attributes: operatorDict.attributes,
            dataTypes: new Map<AttributeName, DataType>(
                <Array<[AttributeName, DataType]>>
                operatorDict.dataTypes.map(
                    ([name, dataTypeCode]) => [name, DataTypes.fromCode(dataTypeCode)]
                )
            ),
            units: new Map<AttributeName, Unit>(
                <Array<[AttributeName, Unit]>>
                operatorDict.units.map(([name, unitDict]) => [name, Unit.fromDict(unitDict)])
            ),
            rasterSources: operatorDict.rasterSources.map(Operator.fromDict),
            pointSources: operatorDict.pointSources.map(Operator.fromDict),
            lineSources: operatorDict.lineSources.map(Operator.fromDict),
            polygonSources: operatorDict.polygonSources.map(Operator.fromDict),
        });

        Operator._operatorId = Math.max(Operator._operatorId, operatorDict.id + 1);
        operator._id = operatorDict.id;
        // TODO: check for operator id clashes.

        return operator;
    }

}
