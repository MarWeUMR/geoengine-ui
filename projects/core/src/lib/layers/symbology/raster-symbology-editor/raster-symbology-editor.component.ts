import {Component, Input, ChangeDetectionStrategy, OnChanges, SimpleChanges, OnDestroy, AfterViewInit, OnInit} from '@angular/core';
import {BehaviorSubject, combineLatest, Observable, of, ReplaySubject, Subscription} from 'rxjs';
import {map, mergeMap, tap} from 'rxjs/operators';
import {RasterSymbology} from '../symbology.model';
import {RasterLayer} from '../../layer.model';
import {MapService} from '../../../map/map.service';
import {ProjectService} from '../../../project/project.service';
import {Config} from '../../../config.service';
import {BackendService} from '../../../backend/backend.service';
import {MatSliderChange} from '@angular/material/slider';
import {HistogramDict, HistogramParams} from '../../../backend/operator.model';
import {LinearGradient, LogarithmicGradient, PaletteColorizer} from '../../../colors/colorizer.model';
import {ColorAttributeInput} from '../../../colors/color-attribute-input/color-attribute-input.component';
import {UUID, WorkflowDict} from '../../../backend/backend.model';
import {ColorBreakpoint} from '../../../colors/color-breakpoint.model';
import {UserService} from '../../../users/user.service';
import {extentToBboxDict} from '../../../util/conversions';
import {VegaChartData} from '../../../plots/vega-viewer/vega-viewer.component';
import {Color} from '../../../colors/color';

/**
 * An editor for generating raster symbologies.
 */
@Component({
    selector: 'geoengine-raster-symbology-editor',
    templateUrl: 'raster-symbology-editor.component.html',
    styleUrls: ['raster-symbology-editor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RasterSymbologyEditorComponent implements OnChanges, OnDestroy, AfterViewInit, OnInit {
    @Input() layer!: RasterLayer;

    symbology!: RasterSymbology;

    // The min value used for color table generation
    layerMinValue: number | undefined = undefined;
    // The max value used for color table generation
    layerMaxValue: number | undefined = undefined;

    scale: 'linear' | 'logarithmic' = 'linear';

    histogramData = new ReplaySubject<VegaChartData>(1);
    histogramLoading = new BehaviorSubject(false);
    protected histogramWorkflowId = new ReplaySubject<UUID>(1);
    protected histogramSubscription?: Subscription;

    protected defaultColor?: ColorAttributeInput;
    protected noDataColor?: ColorAttributeInput;
    protected overColor?: ColorAttributeInput;
    protected underColor?: ColorAttributeInput;

    constructor(
        protected readonly projectService: ProjectService,
        protected readonly backend: BackendService,
        protected readonly userService: UserService,
        protected readonly mapService: MapService,
        protected readonly config: Config,
    ) {}

    ngOnChanges(_changes: SimpleChanges): void {}

    ngOnInit(): void {
        this.symbology = this.layer.symbology.clone();
        this.updateNodataAndDefaultColor();

        this.updateSymbologyFromLayer();
        this.updateLayerMinMaxFromColorizer();

        this.createHistogramWorkflowId().subscribe((histogramWorkflowId) => this.histogramWorkflowId.next(histogramWorkflowId));
    }

    ngAfterViewInit(): void {
        this.initializeHistogramDataSubscription();
    }

    ngOnDestroy(): void {
        if (this.histogramSubscription) {
            this.histogramSubscription.unsubscribe();
        }
    }

    get histogramAutoReload(): boolean {
        return !!this.histogramSubscription;
    }

    set histogramAutoReload(autoReload: boolean) {
        if (autoReload) {
            this.initializeHistogramDataSubscription();
        } else {
            this.histogramSubscription?.unsubscribe();
            this.histogramSubscription = undefined;
        }
    }

    /**
     * Set the max value to use for color table generation
     */
    updateLayerMinValue(min: number): void {
        if (this.layerMinValue !== min) {
            this.layerMinValue = min;
        }
    }

    /**
     * Set the max value to use for color table generation
     */
    updateLayerMaxValue(max: number): void {
        if (this.layerMaxValue !== max) {
            this.layerMaxValue = max;
        }
    }

    updateBounds(histogramSignal: {binStart: [number, number]}): void {
        if (!histogramSignal || !histogramSignal.binStart || histogramSignal.binStart.length !== 2) {
            return;
        }

        const [min, max] = histogramSignal.binStart;

        this.updateLayerMinValue(min);
        this.updateLayerMaxValue(max);
    }

    /**
     * Get the opacity in the range [0, 100]
     */
    getOpacity(): number {
        return this.symbology.opacity * 100;
    }

    /**
     * Set the opacity value from a slider change event
     */
    updateOpacity(event: MatSliderChange): void {
        if (!event || !event.value) {
            return;
        }

        const opacity = event.value / 100;

        this.symbology = this.symbology.cloneWith({opacity});

        this.update();
    }

    getDefaultColor(): ColorAttributeInput {
        if (!this.defaultColor) {
            throw new Error('uninitialized defaultColor');
        }

        return this.defaultColor;
    }

    updateDefaultColor(defaultColorInput: ColorAttributeInput): void {
        const defaultColor = defaultColorInput.value;

        if (this.symbology.colorizer instanceof LinearGradient || this.symbology.colorizer instanceof LogarithmicGradient) {
            const colorizer = this.symbology.colorizer.cloneWith({defaultColor});
            this.symbology = this.symbology.cloneWith({colorizer});
        } else if (this.symbology.colorizer instanceof PaletteColorizer) {
            const colorizer = this.symbology.colorizer.cloneWith({defaultColor});
            this.symbology = this.symbology.cloneWith({colorizer});
        } else {
            throw new Error('unsupported colorizer type');
        }

        this.update();
    }

    getOverColor(): ColorAttributeInput {
        if (!this.overColor) {
            throw new Error('uninitialized defaultColor');
        }

        return this.overColor;
    }

    updateOverColor(overColorInput: ColorAttributeInput): void {
        const overColor = overColorInput.value;

        if (this.symbology.colorizer instanceof LinearGradient || this.symbology.colorizer instanceof LogarithmicGradient) {
            const colorizer = this.symbology.colorizer.cloneWith({overColor});
            this.symbology = this.symbology.cloneWith({colorizer});
        } else if (this.symbology.colorizer instanceof PaletteColorizer) {
            const colorizer = this.symbology.colorizer.cloneWith({overColor});
            this.symbology = this.symbology.cloneWith({colorizer});
        } else {
            throw new Error('unsupported colorizer type');
        }

        this.update();
    }

    getUnderColor(): ColorAttributeInput {
        if (!this.underColor) {
            throw new Error('uninitialized defaultColor');
        }

        return this.underColor;
    }

    updateUnderColor(underColorInput: ColorAttributeInput): void {
        const underColor = underColorInput.value;

        if (this.symbology.colorizer instanceof LinearGradient || this.symbology.colorizer instanceof LogarithmicGradient) {
            const colorizer = this.symbology.colorizer.cloneWith({underColor});
            this.symbology = this.symbology.cloneWith({colorizer});
        } else if (this.symbology.colorizer instanceof PaletteColorizer) {
            const colorizer = this.symbology.colorizer.cloneWith({underColor});
            this.symbology = this.symbology.cloneWith({colorizer});
        } else {
            throw new Error('unsupported colorizer type');
        }

        this.update();
    }

    getNoDataColor(): ColorAttributeInput {
        if (!this.noDataColor) {
            throw new Error('uninitialized noDataColor');
        }

        return this.noDataColor;
    }

    /**
     * Set the no data color
     */
    updateNoDataColor(noDataColorInput: ColorAttributeInput): void {
        const noDataColor = noDataColorInput.value;

        if (this.symbology.colorizer instanceof LinearGradient || this.symbology.colorizer instanceof LogarithmicGradient) {
            const colorizer = this.symbology.colorizer.cloneWith({noDataColor});
            this.symbology = this.symbology.cloneWith({colorizer});
        } else if (this.symbology.colorizer instanceof PaletteColorizer) {
            const colorizer = this.symbology.colorizer.cloneWith({noDataColor});
            this.symbology = this.symbology.cloneWith({colorizer});
        } else {
            throw new Error('unsupported colorizer type');
        }

        this.update();
    }

    getColorizerType(): 'linearGradient' | 'logarithmicGradient' | 'palette' {
        if (this.symbology.colorizer instanceof LinearGradient) {
            return 'linearGradient';
        }

        if (this.symbology.colorizer instanceof PaletteColorizer) {
            return 'palette';
        }

        if (this.symbology.colorizer instanceof LogarithmicGradient) {
            return 'logarithmicGradient';
        }

        throw Error('unknown colorizer type');
    }

    updateScale(): void {
        if (this.symbology.colorizer instanceof LogarithmicGradient) {
            this.scale = 'logarithmic';
            return;
        }

        this.scale = 'linear';
    }

    updateColorizerType(colorizerType: 'linearGradient' | 'logarithmicGradient' | 'palette'): void {
        if (this.getColorizerType() === colorizerType) {
            return;
        }

        if (colorizerType === 'palette' || this.getColorizerType() === 'palette') {
            // TODO: implement palette
            return;
        }

        if (colorizerType === 'linearGradient') {
            const breakpoints = this.symbology.colorizer.getBreakpoints();
            let noDataColor: Color;
            let defaultColor: Color;

            if (this.symbology.colorizer instanceof LogarithmicGradient) {
                noDataColor = this.symbology.colorizer.noDataColor;
                defaultColor = this.symbology.colorizer.defaultColor;
            } else {
                // TODO: implement palette
                return;
            }

            const colorizer = new LinearGradient(breakpoints, noDataColor, defaultColor);
            this.symbology = this.symbology.cloneWith({colorizer});
        } else if (colorizerType === 'logarithmicGradient') {
            const breakpoints = this.symbology.colorizer.getBreakpoints();
            let noDataColor: Color;
            let defaultColor: Color;

            if (this.symbology.colorizer instanceof LinearGradient) {
                noDataColor = this.symbology.colorizer.noDataColor;
                defaultColor = this.symbology.colorizer.defaultColor;
            } else {
                // TODO: implement palette
                return;
            }

            const colorizer = new LogarithmicGradient(breakpoints, noDataColor, defaultColor);
            this.symbology = this.symbology.cloneWith({colorizer});
        } else if (colorizerType === 'palette') {
            // TODO: implement palette
            return;
        }

        this.updateScale();
        this.update();
    }

    /**
     * Set the symbology colorizer
     */
    updateBreakpoints(breakpoints: Array<ColorBreakpoint>): void {
        if (!breakpoints) {
            return;
        }

        if (!(this.symbology.colorizer instanceof LinearGradient) && !(this.symbology.colorizer instanceof LogarithmicGradient)) {
            return;
            // TODO: implement other variants
        }

        this.symbology = this.symbology.cloneWith({colorizer: this.symbology.colorizer.cloneWith({breakpoints})});

        this.update();
    }

    /**
     * Sets the current (working) symbology to the one of the current layer.
     */
    updateSymbologyFromLayer(): void {
        if (!this.layer || !this.layer.symbology || this.layer.symbology.equals(this.symbology)) {
            return;
        }
        this.symbology = this.layer.symbology;

        this.updateNodataAndDefaultColor();

        this.updateScale();
    }

    /**
     * Sets the layer min/max values from the colorizer.
     */
    updateLayerMinMaxFromColorizer(): void {
        const breakpoints = this.symbology.colorizer.getBreakpoints();
        this.updateLayerMinValue(breakpoints[0].value);
        this.updateLayerMaxValue(breakpoints[breakpoints.length - 1].value);
    }

    private updateNodataAndDefaultColor(): void {
        this.defaultColor = {
            key: 'Overflow Color',
            value: this.symbology.colorizer.defaultColor,
        };
        if (
            this.symbology.colorizer instanceof LinearGradient ||
            this.symbology.colorizer instanceof LogarithmicGradient ||
            this.symbology.colorizer instanceof PaletteColorizer
        ) {
            this.noDataColor = {
                key: 'No Data Color',
                value: this.symbology.colorizer.noDataColor,
            };
            this.overColor = {
                key: 'Over Color',
                value: this.symbology.colorizer.overColor ?? this.symbology.colorizer.defaultColor,
            };
            this.underColor = {
                key: 'Under Color',
                value: this.symbology.colorizer.underColor ?? this.symbology.colorizer.defaultColor,
            };
        } else {
            this.noDataColor = undefined;
        }
    }

    private update(): void {
        this.projectService.changeLayer(this.layer, {symbology: this.symbology});
    }

    private initializeHistogramDataSubscription(): void {
        if (this.histogramSubscription) {
            this.histogramSubscription.unsubscribe();
        }

        this.histogramSubscription = this.createHistogramStream().subscribe((histogramData) => this.histogramData.next(histogramData));
    }

    private createHistogramStream(): Observable<VegaChartData> {
        return combineLatest([
            this.histogramWorkflowId,
            this.projectService.getTimeStream(),
            this.mapService.getViewportSizeStream(),
            this.userService.getSessionTokenForRequest(),
            this.projectService.getSpatialReferenceStream(),
        ]).pipe(
            tap(() => this.histogramLoading.next(true)),
            mergeMap(([workflowId, time, viewport, sessionToken, sref]) =>
                this.backend.getPlot(
                    workflowId,
                    {
                        bbox: extentToBboxDict(viewport.extent),
                        crs: sref.srsString,
                        spatialResolution: [viewport.resolution, viewport.resolution],
                        time: time.toDict(),
                    },
                    sessionToken,
                ),
            ),
            map((plotData) => plotData.data),
            tap(() => this.histogramLoading.next(false)),
        );
    }

    private createHistogramWorkflowId(): Observable<UUID> {
        return this.projectService.getWorkflow(this.layer.workflowId).pipe(
            mergeMap((workflow) =>
                combineLatest([
                    of({
                        type: 'Plot',
                        operator: {
                            type: 'Histogram',
                            params: {
                                buckets: 20,
                                bounds: 'data',
                                interactive: true,
                            } as HistogramParams,
                            sources: {
                                source: workflow.operator,
                            },
                        } as HistogramDict,
                    } as WorkflowDict),
                    this.userService.getSessionTokenForRequest(),
                ]),
            ),
            mergeMap(([workflow, sessionToken]) => this.backend.registerWorkflow(workflow, sessionToken)),
            map((workflowRegistration) => workflowRegistration.id),
        );
    }
}
