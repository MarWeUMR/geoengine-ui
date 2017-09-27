import {NgModule} from '@angular/core'

import {
    MdButtonToggleModule,
    MdButtonModule,
    MdCheckboxModule,
    MdRadioModule,
    MdSelectModule,
    MdSlideToggleModule,
    MdSliderModule,
    MdSidenavModule,
    MdListModule,
    MdGridListModule,
    MdCardModule,
    MdChipsModule,
    MdIconModule,
    MdProgressSpinnerModule,
    MdProgressBarModule,
    MdInputModule,
    MdSnackBarModule,
    MdTabsModule,
    MdToolbarModule,
    MdTooltipModule,
    MdMenuModule,
    MdDialogModule,
    MdAutocompleteModule,
    MdDatepickerModule,
    MdExpansionModule,
    MdPaginatorModule,
    MdTableModule,
} from '@angular/material';

const MATERIAL_MODULES = [
    MdAutocompleteModule,
    MdButtonModule,
    MdButtonToggleModule,
    MdCardModule,
    MdChipsModule,
    MdCheckboxModule,
    MdDatepickerModule,
    MdDialogModule,
    MdGridListModule,
    MdIconModule,
    MdInputModule,
    MdListModule,
    MdMenuModule,
    MdProgressBarModule,
    MdProgressSpinnerModule,
    MdRadioModule,
    MdSelectModule,
    MdSidenavModule,
    MdSliderModule,
    MdSlideToggleModule,
    MdSnackBarModule,
    MdTabsModule,
    MdToolbarModule,
    MdTooltipModule,
    MdExpansionModule,
    MdPaginatorModule,
    MdTableModule,
];

@NgModule({
    imports: MATERIAL_MODULES,
    exports: MATERIAL_MODULES,
})
export class MaterialModule {
}
