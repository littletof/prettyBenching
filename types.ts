/** Defines an indicator that should be used for the matching benches */
export interface BenchIndicator {
  /** Selects which benches the indicator should be used for, by matching the `RegExp` against the bench names */
  benches: RegExp;
  /** Modifies the default indicator character to the returned string.
   * 
   * *Note*: If color functions are used, the `nocolor` option doesnt affect them
   * @param str: The default indicator char
   */
  modFn?: (
    str: string,
  ) => string | { indicator: string; visibleLength: number };
  /** Defines a color that should be assosiated with the matching benches. A simple std color function should be provided.
   * 
   * *Note*: If color functions are used, the `nocolor` option doesnt affect them
   */
  color?: (str: string) => string;
}

/** Defines a threshold, which has three sections.
 * 
 * 1. *`0` <= && <= `green`* --> `green` section
 * 2. *`green` < && <= `yellow`* --> `yellow` section
 * 3. *`yellow` < && <= infinite* --> `red` section
 */
export interface Threshold {
  /** Defines the upper limit of the `green` section in milliseconds. */
  green: number;
  /** Deifnes the upper limit of the `yellow` section in milliseconds. */
  yellow: number;
}

/** Defines `Threshold`-s for specific benches. Each `key` of this object should correspond to a specific benchmark's `name`*/
export interface Thresholds {
  [key: string]: Threshold;
}
