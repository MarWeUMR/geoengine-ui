import {Component, ChangeDetectionStrategy, forwardRef, SimpleChange, Input, OnChanges, OnDestroy} from '@angular/core';
import {NG_VALUE_ACCESSOR, ControlValueAccessor} from '@angular/forms';
import {Layer} from '../../../../layers/layer.model';
import {Symbology} from '../../../../layers/symbology/symbology.model';
import {ResultType} from '../../../result-type.model';
import {ProjectService} from '../../../../project/project.service';
import {Observable, ReplaySubject, Subject, BehaviorSubject, Subscription} from 'rxjs';
import {LayerService} from '../../../../layers/layer.service';

/**
 * Singleton for a letter to number converter for ids.
 */
export const LetterNumberConverter = { // tslint:disable-line:variable-name
    /**
     * Convert a numeric id to a alphanumeric one.
     * Starting with `1`.
     */
    toLetters: (num: number) => {
        let mod = num % 26;
        let pow = num / 26 | 0; // tslint:disable-line:no-bitwise
        // noinspection CommaExpressionJS
        let out = mod ? String.fromCharCode(64 + mod) : (--pow, 'Z');
        return pow ? this.toLetters(pow) + out : out;
    },

    /**
     * Convert an alphanumeric id to a numeric one.
     * Starting with `A`.
     */
    fromLetters: (str: string) => {
        let out = 0;
        let len = str.length;
        let pos = len;
        while (--pos > -1) {
            out += (str.charCodeAt(pos) - 64) * Math.pow(26, len - 1 - pos);
        }
        return out;
    },
};

@Component({
    selector: 'wave-multi-layer-selection',
    templateUrl: './multi-layer-selection.component.html',
    styleUrls: ['./multi-layer-selection.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MultiLayerSelectionComponent), multi: true},
    ],
})
export class MultiLayerSelectionComponent implements ControlValueAccessor, OnChanges, OnDestroy {

    /**
     * An array of possible layers.
     */
    @Input() layers: Array<Layer<Symbology>> | Observable<Array<Layer<Symbology>>> = this.projectService.getLayerStream();

    /**
     * The minimum number of elements to select.
     */
    @Input() min = 1;

    /**
     * The maximum number of elements to select.
     */
    @Input() max = 1;

    /**
     * The initial amount of elements to select.
     * @type {number}
     */
    @Input() initialAmount = 1;

    /**
     * The type is used as a filter for the layers to choose from.
     */
    @Input() types: Array<ResultType>;

    /**
     * The title of the component (optional).
     */
    @Input() title: string = undefined;

    onTouched: () => void;
    onChange: (_: Array<Layer<Symbology>>) => void = undefined;

    filteredLayers: Subject<Array<Layer<Symbology>>> = new ReplaySubject(1);
    selectedLayers = new BehaviorSubject<Array<Layer<Symbology>>>([]);

    private layerSubscription: Subscription;
    private selectionSubscription: Subscription;

    constructor(private projectService: ProjectService,
                private layerService: LayerService) {
        this.layerSubscription = this.filteredLayers.subscribe(filteredLayers => {
            this.selectedLayers.next(
                this.layersForInitialSelection(filteredLayers, [], this.initialAmount)
            );
        });

        this.selectionSubscription = this.selectedLayers.subscribe(selectedLayers => {
            if (this.onChange) {
                this.onChange(selectedLayers);
            }
        });
    }

    ngOnChanges(changes: { [propertyName: string]: SimpleChange }) {
        let minMaxInitialChanged = false;
        let initialChange = false;

        for (let propName in changes) { // tslint:disable-line:forin
            switch (propName) {
                case 'initialAmount':
                    initialChange = changes[propName].isFirstChange();
                /* falls through */
                case 'min':
                case 'max':
                    minMaxInitialChanged = true;
                    break;
                case 'layers':
                case 'types':
                    if (this.layers instanceof Observable) {
                        this.layers.first().subscribe(layers => {
                            this.filteredLayers.next(
                                layers.filter((layer: Layer<Symbology>) => {
                                    return this.types.indexOf(layer.operator.resultType) >= 0;
                                })
                            );
                        });
                    } else if (this.layers instanceof Array) {
                        this.filteredLayers.next(
                            this.layers.filter((layer: Layer<Symbology>) => {
                                return this.types.indexOf(layer.operator.resultType) >= 0;
                            })
                        );
                    }

                    if (this.title === undefined) {
                        this.title = this.types.map(type => type.toString()).join(', ');
                    }
                    break;

                default:
                // DO NOTHING
            }
        }

        if (minMaxInitialChanged) {
            Observable
                .combineLatest(this.filteredLayers, this.selectedLayers)
                .first()
                .subscribe(([filteredLayers, selectedLayers]) => {
                    const amountOfLayers = selectedLayers.length;

                    if (this.max < amountOfLayers) {
                        // remove selected layers
                        const difference = amountOfLayers - this.max;
                        this.selectedLayers.next(selectedLayers.slice(0, amountOfLayers - difference));
                    } else if (this.min > amountOfLayers) {
                        // add selected layers
                        const difference = this.min - amountOfLayers;
                        this.selectedLayers.next(selectedLayers.concat(
                            this.layersForInitialSelection(filteredLayers, [], difference)
                        ));
                    }

                    if (initialChange) {
                        // set initial layers
                        this.selectedLayers.next(
                            this.layersForInitialSelection(filteredLayers, [], this.initialAmount)
                        );
                    }
                });
        }
    }

    ngOnDestroy() {
        this.layerSubscription.unsubscribe();
        this.selectionSubscription.unsubscribe();
    }

    updateLayer(index: number, layer: Layer<Symbology>) {
        this.selectedLayers.first().subscribe(selectedLayers => {
            const newSelectedLayers = [...selectedLayers];
            newSelectedLayers[index] = layer;
            this.selectedLayers.next(newSelectedLayers);
        });
    }

    add() {
        Observable
            .combineLatest(
                this.filteredLayers,
                this.selectedLayers,
            )
            .first()
            .subscribe(([filteredLayers, selectedLayers]) => {
                this.selectedLayers.next(selectedLayers.concat(
                    this.layersForInitialSelection(filteredLayers, selectedLayers, 1)
                ));

                this.onBlur();
            });
    }

    remove() {
        this.selectedLayers.first().subscribe(selectedLayers => {
            this.selectedLayers.next(selectedLayers.slice(0, selectedLayers.length - 1));

            this.onBlur();
        });
    }

    onBlur() {
        if (this.onTouched) {
            this.onTouched();
        }
    }

    writeValue(layers: Array<Layer<Symbology>>): void {
        if (layers) {
            this.selectedLayers.next(layers);
        } else if (this.onChange) {
            this.onChange(this.selectedLayers.getValue());
        }
    }

    registerOnChange(fn: (_: Array<Layer<Symbology>>) => void): void {
        this.onChange = fn;

        this.onChange(this.selectedLayers.getValue());
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    // noinspection JSMethodCanBeStatic
    toLetters(i: number): string {
        return LetterNumberConverter.toLetters(i + 1);
    }

    private layersForInitialSelection(layers: Array<Layer<Symbology>>,
                                      blacklist: Array<Layer<Symbology>>,
                                      amount: number): Array<Layer<Symbology>> {
        if (layers.length === 0) {
            return [];
        }

        const layersForSelection = [...layers].filter(layer => blacklist.indexOf(layer) < 0);

        const selectedLayerIndex = layersForSelection.indexOf(this.layerService.getSelectedLayer());
        if (selectedLayerIndex >= 0) {
            // swap to front
            layersForSelection[0] = layersForSelection.splice(selectedLayerIndex, 1, layersForSelection[0])[0];
        }

        const difference = amount - layersForSelection.length;
        for (let i = 0; i < difference; i++) {
            layersForSelection.push(layers[0]);
        }

        return layersForSelection.slice(0, amount);
    }

}
