import {Unit, UnitDict, UnitMappingDict} from "./unit.model";
import {DataType, DataTypes} from "./datatype.model";
import {Projection, Projections} from "./projection.model";

/**
 * Dictionary for querying the server.
 */
export interface OperatorTypeMappingDict {}

/**
 * Dictionary for serializing the operator type.
 */
export interface OperatorTypeDict {
    operatorType: string;
}

/**
 * The operator basic type.
 */
export abstract class OperatorType {
    /**
     * Get the server-side name of the type.
     */
    abstract getMappingName(): string;

    /**
     * Human-readable type name.
     */
    abstract toString(): string;

    /**
     * Serialize the operator type.
     */
    abstract toDict(): OperatorTypeDict;

    /**
     * Create query parameter.
     */
    abstract toMappingDict(): OperatorTypeMappingDict;

    /**
     * Icon respresentation of the operator.
     */
    getIconUrl(): string {
        // TODO: replace with proper icons
        // from `http://stackoverflow.com/questions/3426404/
        // create-a-hexadecimal-colour-based-on-a-string-with-javascript`
        const hashCode = (str: string) => { // java String#hashCode
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
               hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            return hash;
        };
        const intToRGB = (i: number) => {
            const c = (i & 0x00FFFFFF).toString(16).toUpperCase();

            return "00000".substring(0, 6 - c.length) + c;
        };

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        context.fillStyle = intToRGB(hashCode(this.getMappingName()));
        context.fillRect(0, 0, 64, 64);
        return canvas.toDataURL("image/png");
    }

    /**
     * Get a human readable parameter list.
     */
    abstract getParametersAsStrings(): Array<[string, string]>;

    /**
     * Create operator type from serialized data.
     */
    static fromDict(dict: OperatorTypeDict): OperatorType {
        switch (dict.operatorType) {
            case NumericAttributeFilterType.TYPE:
                return NumericAttributeFilterType.fromDict(<NumericAttributeFilterTypeDict> dict);
            case RasterValueExtractionType.TYPE:
                return RasterValueExtractionType.fromDict(<RasterValueExtractionTypeDict> dict);
            case ExpressionType.TYPE:
                return ExpressionType.fromDict(<ExpressionTypeDict> dict);
            case ProjectionType.TYPE:
                return ProjectionType.fromDict(<ProjectionTypeDict> dict);
            case GFBioPointSourceType.TYPE:
                return GFBioPointSourceType.fromDict(<GFBioPointSourceTypeDict> dict);
            case RasterSourceType.TYPE:
                return RasterSourceType.fromDict(<RasterSourceTypeDict> dict);
        }
    }
}

interface NumericAttributeFilterTypeMappingDict extends OperatorTypeMappingDict {
    name: string;
    includeNoData: boolean;
    rangeMin: number;
    rangeMax: number;
}

interface NumericAttributeFilterTypeDict extends OperatorTypeDict  {
    attributeName: string;
    includeNoData: boolean;
    rangeMin: number;
    rangeMax: number;
}

interface NumericAttributeFilterTypeConfig {
    attributeName: string;
    includeNoData: boolean;
    rangeMin: number;
    rangeMax: number;
}

/**
 * The numeric attribute filter type.
 */
export class NumericAttributeFilterType extends OperatorType {
    static get TYPE(): string { return "features_filter_by_range"; };

    private name: string;
    private includeNoData: boolean;
    private rangeMin: number;
    private rangeMax: number;

    constructor(config: NumericAttributeFilterTypeConfig) {
        super();
        this.name = config.attributeName;
        this.includeNoData = config.includeNoData;
        this.rangeMin = config.rangeMin;
        this.rangeMax = config.rangeMax;
    }

    getMappingName(): string {
        return NumericAttributeFilterType.TYPE;
    }

    toString(): string {
        return "Numeric Attribute Filter";
    }

    getParametersAsStrings(): Array<[string, string]> {
        return [
            ["includeNoData", this.includeNoData.toString()],
            ["rangeMin", this.rangeMin.toString()],
            ["rangeMax", this.rangeMax.toString()],
        ];
    }

    toMappingDict(): NumericAttributeFilterTypeMappingDict {
        return {
            name: this.name,
            includeNoData: this.includeNoData,
            rangeMin: this.rangeMin,
            rangeMax: this.rangeMax,
        };
    }

    toDict(): NumericAttributeFilterTypeDict {
        return {
            operatorType: NumericAttributeFilterType.TYPE,
            attributeName: this.name,
            includeNoData: this.includeNoData,
            rangeMin: this.rangeMin,
            rangeMax: this.rangeMax,
        };
    }

    static fromDict(dict: NumericAttributeFilterTypeDict): NumericAttributeFilterType {
        return new NumericAttributeFilterType(dict);
    }
}

interface RasterValueExtractionTypeMappingDict extends OperatorTypeMappingDict {
    xResolution: number;
    yResolution: number;
    names: Array<string>;
}

interface RasterValueExtractionTypeDict extends OperatorTypeDict  {
    xResolution: number;
    yResolution: number;
    attributeNames: Array<string>;
}

interface RasterValueExtractionTypeConfig {
    xResolution: number;
    yResolution: number;
    attributeNames: Array<string>;
}

/**
 * The raster value extraction type.
 */
export class RasterValueExtractionType extends OperatorType {
    static get TYPE(): string {
        return "raster_metadata_to_points";
    }

    private xResolution: number;
    private yResolution: number;
    private attributeNames: Array<string>;

    constructor(config: RasterValueExtractionTypeConfig) {
        super();
        this.xResolution = config.xResolution;
        this.yResolution = config.yResolution;
        this.attributeNames = config.attributeNames;
    }

    getMappingName(): string {
        return RasterValueExtractionType.TYPE;
    }

    toString(): string {
        return "Raster Value Extraction";
    }

    getParametersAsStrings(): Array<[string, string]> {
        return [
            ["xResolution", this.xResolution.toString()],
            ["yResolution", this.yResolution.toString()],
            ["attributeNames", this.attributeNames.join(", ")],
        ];
    }

    toMappingDict(): RasterValueExtractionTypeMappingDict {
        return {
            xResolution: this.xResolution,
            yResolution: this.yResolution,
            names: this.attributeNames,
        };
    }

    toDict(): RasterValueExtractionTypeDict {
        return {
            operatorType: RasterValueExtractionType.TYPE,
            xResolution: this.xResolution,
            yResolution: this.yResolution,
            attributeNames: this.attributeNames,
        };
    }

    static fromDict(dict: RasterValueExtractionTypeDict): RasterValueExtractionType {
        return new RasterValueExtractionType(dict);
    }
}

interface ExpressionTypeConfig {
    expression: string;
    datatype: DataType;
    unit: Unit;
}

interface ExpressionTypeMappingDict extends OperatorTypeMappingDict {
    expression: string;
    datatype: string;
    unit: UnitMappingDict;
}

interface ExpressionTypeDict extends OperatorTypeDict  {
    expression: string;
    datatype: string;
    unit: UnitDict;
}

/**
 * The expression type.
 */
export class ExpressionType extends OperatorType {
    static get TYPE(): string { return "expression"; }

    private expression: string;
    private datatype: DataType;
    private unit: Unit;

    constructor(config: ExpressionTypeConfig) {
        super();
        this.expression = config.expression;
        this.datatype = config.datatype;
        this.unit = config.unit;
    }

    getMappingName(): string {
        return ExpressionType.TYPE;
    }

    toString(): string {
        return "Expression";
    }

    getParametersAsStrings(): Array<[string, string]> {
        return [
            ["expression", this.expression.toString()],
            ["datatype", this.datatype.toString()],
            ["unit", this.unit.toString()],
        ];
    }

    toMappingDict(): ExpressionTypeMappingDict {
        return {
            expression: this.expression,
            datatype: this.datatype.getCode(),
            unit: this.unit.toMappingDict(),
        };
    }

    toDict(): ExpressionTypeDict {
        return {
            operatorType: ExpressionType.TYPE,
            expression: this.expression,
            datatype: this.datatype.getCode(),
            unit: this.unit.toDict(),
        };
    }

    static fromDict(dict: ExpressionTypeDict): ExpressionType {
        return new ExpressionType({
            expression: dict.expression,
            datatype: DataTypes.fromCode(dict.datatype),
            unit: Unit.fromDict(dict.unit),
        });
    }
}

interface GFBioPointSourceTypeConfig {
    datasource: string;
    query: string;
}

interface GFBioPointSourceTypeMappingDict extends OperatorTypeMappingDict {
    datasource: string;
    query: string;
}

interface GFBioPointSourceTypeDict extends OperatorTypeDict  {
    datasource: string;
    query: string;
}

/**
 * The GFBio point source type.
 */
export class GFBioPointSourceType extends OperatorType {
    static get TYPE(): string { return "gfbiopointsource"; };

    private datasource: string;
    private query: string;

    constructor(config: GFBioPointSourceTypeConfig) {
        super();
        this.datasource = config.datasource;
        this.query = config.query;
    }

    getMappingName(): string {
        return GFBioPointSourceType.TYPE;
    }

    toString(): string {
        return "GFBio Point Source";
    }

    getParametersAsStrings(): Array<[string, string]> {
        return [
            ["datasource", this.datasource.toString()],
            ["query", this.query.toString()],
        ];
    }

    toMappingDict(): GFBioPointSourceTypeMappingDict {
        return {
            datasource: this.datasource,
            query: this.query,
        };
    }

    toDict(): GFBioPointSourceTypeDict {
        return {
            operatorType: GFBioPointSourceType.TYPE,
            datasource: this.datasource,
            query: this.query,
        };
    }

    static fromDict(dict: GFBioPointSourceTypeDict): GFBioPointSourceType {
        return new GFBioPointSourceType({
            datasource: dict.datasource,
            query: dict.query,
        });
    }
}

interface ProjectionTypeConfig {
    srcProjection: Projection;
    destProjection: Projection;
}

interface ProjectionTypeMappingDict extends OperatorTypeMappingDict {
    src_projection: string;
    dest_projection: string;
}

interface ProjectionTypeDict extends OperatorTypeDict  {
    srcProjection: string;
    destProjection: string;
}

/**
 * The projection type.
 */
export class ProjectionType extends OperatorType {
    static get TYPE(): string { return "projection"; };

    private srcProjection: Projection;
    private destProjection: Projection;

    constructor(config: ProjectionTypeConfig) {
        super();
        this.srcProjection = config.srcProjection;
        this.destProjection = config.destProjection;
    }

    getMappingName(): string {
        return ProjectionType.TYPE;
    }

    toString(): string {
        return "Expression";
    }

    getParametersAsStrings(): Array<[string, string]> {
        return [
            ["srcProjection", this.srcProjection.toString()],
            ["destProjection", this.destProjection.toString()],
        ];
    }

    toMappingDict(): ProjectionTypeMappingDict {
        return {
            src_projection: this.srcProjection.getCode(),
            dest_projection: this.destProjection.getCode(),
        };
    }

    toDict(): ProjectionTypeDict {
        return {
            operatorType: ProjectionType.TYPE,
            srcProjection: this.srcProjection.getCode(),
            destProjection: this.destProjection.getCode(),
        };
    }

    static fromDict(dict: ProjectionTypeDict): ProjectionType {
        return new ProjectionType({
            srcProjection: Projections.fromCode(dict.srcProjection),
            destProjection: Projections.fromCode(dict.destProjection),
        });
    }
}

interface RasterSourceTypeConfig {
    channel: number;
    sourcename: string;
    transform: boolean;
}

interface RasterSourceTypeMappingDict extends OperatorTypeMappingDict {
    channel: number;
    sourcename: string;
    transform: boolean;
}

interface RasterSourceTypeDict extends OperatorTypeDict  {
    channel: number;
    sourcename: string;
    transform: boolean;
}

/**
 * The raster source type.
 */
export class RasterSourceType extends OperatorType {
    static get TYPE(): string { return "source"; };

    private channel: number;
    private sourcename: string;
    private transform: boolean;

    constructor(config: RasterSourceTypeConfig) {
        super();
        this.channel = config.channel;
        this.sourcename = config.sourcename;
        this.transform = config.transform;
    }

    getMappingName(): string {
        return RasterSourceType.TYPE;
    }

    toString(): string {
        return "Raster Source";
    }

    getParametersAsStrings(): Array<[string, string]> {
        return [
            ["channel", this.channel.toString()],
            ["sourcename", this.sourcename.toString()],
            ["transform", this.transform.toString()],
        ];
    }

    toMappingDict(): RasterSourceTypeMappingDict {
        return {
            sourcename: this.sourcename,
            channel: this.channel,
            transform: this.transform,
        };
    }

    toDict(): RasterSourceTypeDict {
        return {
            operatorType: RasterSourceType.TYPE,
            sourcename: this.sourcename,
            channel: this.channel,
            transform: this.transform,
        };
    }

    static fromDict(dict: RasterSourceTypeDict): RasterSourceType {
        return new RasterSourceType(dict);
    }
}
